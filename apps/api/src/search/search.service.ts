import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SearchResult {
  meetingId: string;
  meetingTitle: string;
  timestamp: number;
  speaker: string;
  text: string;
  score: number;
  context: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Semantic search across all meetings in an organization
   */
  async search(
    organizationId: string,
    query: string,
    options: {
      limit?: number;
      meetingIds?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      speakers?: string[];
    } = {},
  ): Promise<SearchResult[]> {
    const { limit = 20, meetingIds, dateFrom, dateTo, speakers } = options;

    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query);

    // Get all embeddings for the organization (with filters)
    const whereClause: any = {
      meeting: {
        organizationId,
        status: 'COMPLETED',
      },
    };

    if (meetingIds?.length) {
      whereClause.meetingId = { in: meetingIds };
    }

    if (dateFrom || dateTo) {
      whereClause.meeting.createdAt = {};
      if (dateFrom) whereClause.meeting.createdAt.gte = dateFrom;
      if (dateTo) whereClause.meeting.createdAt.lte = dateTo;
    }

    if (speakers?.length) {
      whereClause.speaker = { in: speakers };
    }

    const embeddings = await this.prisma.meetingEmbedding.findMany({
      where: whereClause,
      include: {
        meeting: {
          select: { id: true, title: true },
        },
      },
    });

    // Calculate cosine similarity
    const results = embeddings
      .map((emb) => ({
        meetingId: emb.meetingId,
        meetingTitle: emb.meeting.title,
        timestamp: emb.timestamp || 0,
        speaker: emb.speaker || 'Unknown',
        text: emb.chunkText,
        score: this.cosineSimilarity(queryEmbedding, emb.embedding as number[]),
        context: emb.chunkText,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results.filter((r) => r.score > 0.5); // Threshold
  }

  /**
   * Full-text search (fallback when embeddings not available)
   */
  async textSearch(
    organizationId: string,
    query: string,
    limit = 20,
  ): Promise<SearchResult[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { transcript: { rawText: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        transcript: true,
      },
      take: limit,
    });

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const meeting of meetings) {
      if (!meeting.transcript) continue;

      const segments = meeting.transcript.content as any[];
      for (const segment of segments) {
        if (segment.text.toLowerCase().includes(queryLower)) {
          results.push({
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            timestamp: segment.timestamp,
            speaker: segment.speaker,
            text: segment.text,
            score: 1.0,
            context: segment.text,
          });
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Generate embeddings for a meeting's transcript
   */
  async generateEmbeddings(meetingId: string): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { transcript: true },
    });

    if (!meeting?.transcript) {
      throw new Error('Meeting or transcript not found');
    }

    const segments = meeting.transcript.content as any[];
    
    // Chunk segments (combine nearby segments for better context)
    const chunks = this.chunkTranscript(segments, 500); // ~500 words per chunk

    // Delete existing embeddings
    await this.prisma.meetingEmbedding.deleteMany({
      where: { meetingId },
    });

    // Generate and store embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.getEmbedding(chunk.text);

      await this.prisma.meetingEmbedding.create({
        data: {
          meetingId,
          chunkIndex: i,
          chunkText: chunk.text,
          timestamp: chunk.startTimestamp,
          speaker: chunk.mainSpeaker,
          embedding: embedding,
        },
      });
    }

    this.logger.log(`Generated ${chunks.length} embeddings for meeting ${meetingId}`);
  }

  /**
   * Get trending topics across meetings
   */
  async getTrendingTopics(
    organizationId: string,
    days = 30,
  ): Promise<Array<{ topic: string; count: number; meetings: string[] }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const analyses = await this.prisma.analysis.findMany({
      where: {
        meeting: {
          organizationId,
          createdAt: { gte: since },
        },
      },
      include: {
        meeting: { select: { id: true, title: true } },
      },
    });

    // Extract topics from analyses
    const topicCounts: Map<string, { count: number; meetings: Set<string> }> = new Map();

    for (const analysis of analyses) {
      const topics = analysis.topics as any[];
      if (!topics) continue;

      for (const topic of topics) {
        const topicName = typeof topic === 'string' ? topic : topic.name;
        if (!topicCounts.has(topicName)) {
          topicCounts.set(topicName, { count: 0, meetings: new Set() });
        }
        const entry = topicCounts.get(topicName)!;
        entry.count++;
        entry.meetings.add(analysis.meeting.id);
      }
    }

    return Array.from(topicCounts.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        meetings: Array.from(data.meetings),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const geminiKey = this.config.get('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Use Gemini's embedding model
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private chunkTranscript(
    segments: any[],
    maxWords: number,
  ): Array<{ text: string; startTimestamp: number; mainSpeaker: string }> {
    const chunks: Array<{ text: string; startTimestamp: number; mainSpeaker: string }> = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;
    let startTimestamp = 0;
    let speakerCounts: Map<string, number> = new Map();

    for (const segment of segments) {
      const words = segment.text.split(/\s+/).filter((w: string) => w);
      
      if (currentWordCount + words.length > maxWords && currentChunk.length > 0) {
        // Save current chunk
        const mainSpeaker = Array.from(speakerCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        
        chunks.push({
          text: currentChunk.join(' '),
          startTimestamp,
          mainSpeaker,
        });
        
        // Reset
        currentChunk = [];
        currentWordCount = 0;
        speakerCounts = new Map();
        startTimestamp = segment.timestamp;
      }
      
      if (currentChunk.length === 0) {
        startTimestamp = segment.timestamp;
      }
      
      currentChunk.push(`${segment.speaker}: ${segment.text}`);
      currentWordCount += words.length;
      speakerCounts.set(segment.speaker, (speakerCounts.get(segment.speaker) || 0) + words.length);
    }
    
    // Don't forget last chunk
    if (currentChunk.length > 0) {
      const mainSpeaker = Array.from(speakerCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
      
      chunks.push({
        text: currentChunk.join(' '),
        startTimestamp,
        mainSpeaker,
      });
    }
    
    return chunks;
  }
}
