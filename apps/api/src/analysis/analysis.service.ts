import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranscriptionSegment } from '../transcription/transcription.service';

export interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  decisions: string[];
  followUps: string[];
  oratoryMetrics?: OratoryMetrics;
  // 🆕 Advanced analysis
  topics?: TopicCluster[];
  sentiment?: SentimentAnalysis;
  meetingType?: string;
  effectivenessScore?: number;
  suggestions?: string[];
}

export interface OratoryMetrics {
  speakingPace: { [speaker: string]: number };
  fillerWords: { [speaker: string]: { [word: string]: number } };
  participationBalance: { [speaker: string]: number };
}

// 🆕 Topic clustering
export interface TopicCluster {
  name: string;
  keywords: string[];
  confidence: number;
  timeRanges: Array<{ start: number; end: number }>;
  relevantSegments: number[];
}

// 🆕 Sentiment analysis
export interface SentimentAnalysis {
  overall: number; // -1 to 1
  trend: 'improving' | 'declining' | 'stable';
  bySpeaker: { [speaker: string]: number };
  keyMoments: Array<{
    timestamp: number;
    speaker: string;
    sentiment: number;
    trigger?: string;
  }>;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async analyze(
    segments: TranscriptionSegment[],
    rawText: string,
    apiKey?: string,
  ): Promise<AnalysisResult> {
    const geminiKey = apiKey || this.config.get('GEMINI_API_KEY');

    if (!geminiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Format transcript
    const formattedTranscript = segments
      .map((s) => `[${this.formatTime(s.timestamp)}] ${s.speaker}: ${s.text}`)
      .join('\n');

    const prompt = `Analiza esta transcripción de una reunión y proporciona un análisis completo.

TRANSCRIPCIÓN:
${formattedTranscript}

Responde en este formato JSON exacto:
{
  "summary": "Resumen ejecutivo de 2-3 párrafos",
  "keyPoints": ["punto 1", "punto 2", ...],
  "actionItems": [
    {"task": "descripción", "assignee": "persona o null", "deadline": "fecha o null", "priority": "high|medium|low"}
  ],
  "decisions": ["decisión 1", "decisión 2", ...],
  "followUps": ["seguimiento 1", "seguimiento 2", ...]
}

Instrucciones:
- Resumen: Conciso pero completo, captura la esencia de la reunión
- Puntos clave: 5-10 temas principales discutidos
- Action items: Tareas específicas mencionadas, con asignado si se nombra
- Decisiones: Acuerdos explícitos o implícitos
- Seguimientos: Temas pendientes o que requieren revisión futura

Responde SOLO con JSON válido, sin markdown.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const analysis = this.parseResponse(response);

      // Calculate oratory metrics
      const oratoryMetrics = this.calculateOratoryMetrics(segments);

      return {
        ...analysis,
        oratoryMetrics,
      };
    } catch (error) {
      this.logger.error('Gemini analysis failed', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  private calculateOratoryMetrics(segments: TranscriptionSegment[]): OratoryMetrics {
    const speakerData: {
      [speaker: string]: { words: number; time: number; turns: number };
    } = {};

    // Calculate speaking time and word count per speaker
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];
      const duration = nextSegment
        ? nextSegment.timestamp - segment.timestamp
        : segment.text.split(' ').length * 0.4;

      const words = segment.text.split(/\s+/).filter((w) => w).length;

      if (!speakerData[segment.speaker]) {
        speakerData[segment.speaker] = { words: 0, time: 0, turns: 0 };
      }
      speakerData[segment.speaker].words += words;
      speakerData[segment.speaker].time += duration;
      speakerData[segment.speaker].turns += 1;
    }

    // Calculate metrics
    const speakingPace: { [speaker: string]: number } = {};
    const participationBalance: { [speaker: string]: number } = {};
    const totalWords = Object.values(speakerData).reduce((sum, d) => sum + d.words, 0);

    for (const [speaker, data] of Object.entries(speakerData)) {
      if (data.time > 0) {
        speakingPace[speaker] = Math.round((data.words / data.time) * 60);
      }
      participationBalance[speaker] = Math.round((data.words / totalWords) * 100);
    }

    // Detect filler words
    const fillerPatterns = [
      '\\beh\\b', '\\beste\\b', '\\bbueno\\b', '\\bo sea\\b',
      '\\bbásicamente\\b', '\\bdigamos\\b', '\\bpues\\b',
      '\\bmmm\\b', '\\bumm\\b', '\\blike\\b', '\\byou know\\b'
    ];

    const fillerWords: { [speaker: string]: { [word: string]: number } } = {};

    for (const segment of segments) {
      if (!fillerWords[segment.speaker]) {
        fillerWords[segment.speaker] = {};
      }

      const text = segment.text.toLowerCase();
      for (const pattern of fillerPatterns) {
        const regex = new RegExp(pattern, 'gi');
        const matches = text.match(regex);
        if (matches) {
          const word = pattern.replace(/\\b/g, '').replace(/\\/g, '');
          fillerWords[segment.speaker][word] =
            (fillerWords[segment.speaker][word] || 0) + matches.length;
        }
      }
    }

    return {
      speakingPace,
      fillerWords,
      participationBalance,
    };
  }

  private parseResponse(response: string): Omit<AnalysisResult, 'oratoryMetrics'> {
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
      const parsed = JSON.parse(cleaned);
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        actionItems: parsed.actionItems || [],
        decisions: parsed.decisions || [],
        followUps: parsed.followUps || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse analysis response', { response: cleaned });
      return {
        summary: 'Error al procesar el análisis',
        keyPoints: [],
        actionItems: [],
        decisions: [],
        followUps: [],
      };
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ============================================
  // 🆕 Advanced Analysis Methods
  // ============================================

  /**
   * Analyze sentiment throughout the meeting
   */
  async analyzeSentiment(
    segments: TranscriptionSegment[],
    apiKey?: string,
  ): Promise<SentimentAnalysis> {
    const geminiKey = apiKey || this.config.get('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formattedTranscript = segments
      .map((s, i) => `[${i}] [${this.formatTime(s.timestamp)}] ${s.speaker}: ${s.text}`)
      .join('\n');

    const prompt = `Analiza el sentimiento emocional de esta transcripción de reunión.

TRANSCRIPCIÓN:
${formattedTranscript}

Responde en JSON con este formato:
{
  "overall": 0.3,  // -1 (muy negativo) a 1 (muy positivo)
  "trend": "improving",  // "improving" | "declining" | "stable"
  "bySpeaker": {
    "Speaker 1": 0.5,
    "Speaker 2": 0.2
  },
  "keyMoments": [
    {
      "timestamp": 120,
      "speaker": "Speaker 1",
      "sentiment": -0.5,
      "trigger": "frustración por deadline"
    }
  ]
}

Identifica momentos clave donde el sentimiento cambia significativamente.
Responde SOLO con JSON válido.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return this.parseSentimentResponse(response);
    } catch (error) {
      this.logger.error('Sentiment analysis failed', error);
      return {
        overall: 0,
        trend: 'stable',
        bySpeaker: {},
        keyMoments: [],
      };
    }
  }

  /**
   * Extract and cluster topics discussed
   */
  async extractTopics(
    segments: TranscriptionSegment[],
    apiKey?: string,
  ): Promise<TopicCluster[]> {
    const geminiKey = apiKey || this.config.get('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formattedTranscript = segments
      .map((s, i) => `[${i}] [${this.formatTime(s.timestamp)}] ${s.speaker}: ${s.text}`)
      .join('\n');

    const prompt = `Identifica y agrupa los temas principales discutidos en esta reunión.

TRANSCRIPCIÓN:
${formattedTranscript}

Responde en JSON con este formato:
{
  "topics": [
    {
      "name": "Nombre del tema",
      "keywords": ["palabra1", "palabra2"],
      "confidence": 0.9,
      "timeRanges": [{"start": 0, "end": 300}],
      "relevantSegments": [0, 1, 5, 12]
    }
  ]
}

Agrupa temas relacionados. Incluye índices de segmentos relevantes.
Responde SOLO con JSON válido.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return this.parseTopicsResponse(response);
    } catch (error) {
      this.logger.error('Topic extraction failed', error);
      return [];
    }
  }

  /**
   * Detect meeting type automatically
   */
  async detectMeetingType(
    segments: TranscriptionSegment[],
    apiKey?: string,
  ): Promise<{ type: string; confidence: number; suggestions: string[] }> {
    const geminiKey = apiKey || this.config.get('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const rawText = segments.map((s) => s.text).join(' ');
    const speakerCount = new Set(segments.map((s) => s.speaker)).size;

    const prompt = `Detecta el tipo de reunión basándote en su contenido.

RESUMEN:
- Participantes: ${speakerCount}
- Extracto: ${rawText.slice(0, 2000)}...

Tipos posibles: ONE_ON_ONE, STANDUP, SPRINT_PLANNING, RETROSPECTIVE, BRAINSTORM, CLIENT_CALL, INTERVIEW, ALL_HANDS, WORKSHOP, OTHER

Responde en JSON:
{
  "type": "ONE_ON_ONE",
  "confidence": 0.85,
  "suggestions": ["Sugerencia 1 para mejorar este tipo de reunión"]
}

Responde SOLO con JSON válido.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Meeting type detection failed', error);
      return { type: 'OTHER', confidence: 0, suggestions: [] };
    }
  }

  /**
   * Calculate meeting effectiveness score
   */
  calculateEffectivenessScore(
    analysis: AnalysisResult,
    segments: TranscriptionSegment[],
  ): number {
    let score = 50; // Base score

    // Has clear action items (+15)
    if (analysis.actionItems?.length > 0) {
      score += Math.min(15, analysis.actionItems.length * 3);
    }

    // Has decisions (+10)
    if (analysis.decisions?.length > 0) {
      score += Math.min(10, analysis.decisions.length * 2);
    }

    // Balanced participation (+10)
    if (analysis.oratoryMetrics?.participationBalance) {
      const values = Object.values(analysis.oratoryMetrics.participationBalance);
      const max = Math.max(...values);
      const min = Math.min(...values);
      if (max - min < 40) score += 10;
      else if (max - min < 60) score += 5;
    }

    // Good speaking pace (+5)
    if (analysis.oratoryMetrics?.speakingPace) {
      const paces = Object.values(analysis.oratoryMetrics.speakingPace);
      const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
      if (avgPace >= 120 && avgPace <= 150) score += 5;
    }

    // Low filler word usage (+5)
    if (analysis.oratoryMetrics?.fillerWords) {
      const totalFillers = Object.values(analysis.oratoryMetrics.fillerWords)
        .reduce((sum, speaker) => sum + Object.values(speaker).reduce((a, b) => a + b, 0), 0);
      const totalWords = segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
      const fillerRate = totalFillers / totalWords;
      if (fillerRate < 0.02) score += 5;
    }

    // Positive sentiment (+5)
    if (analysis.sentiment?.overall && analysis.sentiment.overall > 0.3) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Full advanced analysis (combines all methods)
   */
  async analyzeAdvanced(
    segments: TranscriptionSegment[],
    rawText: string,
    apiKey?: string,
  ): Promise<AnalysisResult> {
    // Run basic analysis
    const basicAnalysis = await this.analyze(segments, rawText, apiKey);

    // Run advanced analysis in parallel
    const [sentiment, topics, meetingTypeData] = await Promise.all([
      this.analyzeSentiment(segments, apiKey),
      this.extractTopics(segments, apiKey),
      this.detectMeetingType(segments, apiKey),
    ]);

    // Calculate effectiveness score
    const effectivenessScore = this.calculateEffectivenessScore(
      { ...basicAnalysis, sentiment },
      segments,
    );

    return {
      ...basicAnalysis,
      sentiment,
      topics,
      meetingType: meetingTypeData.type,
      effectivenessScore,
      suggestions: meetingTypeData.suggestions,
    };
  }

  private parseSentimentResponse(response: string): SentimentAnalysis {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

    try {
      return JSON.parse(cleaned);
    } catch {
      return { overall: 0, trend: 'stable', bySpeaker: {}, keyMoments: [] };
    }
  }

  private parseTopicsResponse(response: string): TopicCluster[] {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

    try {
      const parsed = JSON.parse(cleaned);
      return parsed.topics || [];
    } catch {
      return [];
    }
  }
}
