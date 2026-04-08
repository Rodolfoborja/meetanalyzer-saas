import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

export interface TranscriptionSegment {
  timestamp: number;
  speaker: string;
  text: string;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  rawText: string;
  wordCount: number;
  duration: number;
  speakers: string[];
  language: string;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async transcribe(
    audioPath: string,
    apiKey?: string,
  ): Promise<TranscriptionResult> {
    const geminiKey = apiKey || this.config.get('GEMINI_API_KEY');

    if (!geminiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Read audio file and convert to base64
    const audioBuffer = fs.readFileSync(audioPath);
    const base64Audio = audioBuffer.toString('base64');
    const mimeType = this.getMimeType(audioPath);

    const prompt = `Transcribe this audio file completely. 

IMPORTANT: Identify different speakers and label them as "Speaker 1", "Speaker 2", etc.

Return the transcription in this exact JSON format:
{
  "segments": [
    {"timestamp": 0, "speaker": "Speaker 1", "text": "What was said"},
    {"timestamp": 15, "speaker": "Speaker 2", "text": "Response"}
  ],
  "language": "es",
  "duration_seconds": 120
}

Rules:
- timestamp is in seconds from start
- Detect language automatically (es, en, etc.)
- Be accurate with speaker changes
- Include everything said
- Return ONLY valid JSON, no markdown`;

    try {
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
      ]);

      const response = result.response.text();
      const parsed = this.parseResponse(response);

      // Calculate metrics
      const rawText = parsed.segments.map((s) => s.text).join(' ');
      const wordCount = rawText.split(/\s+/).filter((w) => w).length;
      const speakers = [...new Set(parsed.segments.map((s) => s.speaker))];

      return {
        segments: parsed.segments,
        rawText,
        wordCount,
        duration: parsed.duration_seconds || 0,
        speakers,
        language: parsed.language || 'es',
      };
    } catch (error) {
      this.logger.error('Gemini transcription failed', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async transcribeFromUrl(
    audioUrl: string,
    apiKey?: string,
  ): Promise<TranscriptionResult> {
    // Download file first, then transcribe
    const axios = (await import('axios')).default;
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    
    const tempPath = path.join('/tmp', `audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempPath, response.data);
    
    try {
      const result = await this.transcribe(tempPath, apiKey);
      return result;
    } finally {
      // Cleanup
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  private parseResponse(response: string): any {
    // Clean up response - remove markdown if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Failed to parse Gemini response', { response: cleaned });
      return {
        segments: [{ timestamp: 0, speaker: 'Speaker 1', text: cleaned }],
        language: 'es',
        duration_seconds: 0,
      };
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
      '.mp4': 'video/mp4',
    };
    return mimeTypes[ext] || 'audio/mp3';
  }
}
