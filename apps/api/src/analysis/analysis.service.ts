import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnalysisJobDto } from './dto/analysis-job.dto';
import { 
  AnalysisResponseDto, 
  AnalysisJobStatusDto,
  ActionItem,
  KeyPoint,
  Decision,
  FollowUp,
  OratoryMetrics,
} from './dto/analysis-response.dto';
import { MeetingStatus, User, LlmProvider } from '@prisma/client';

interface LLMClients {
  openai?: OpenAI;
  anthropic?: Anthropic;
  gemini?: GoogleGenerativeAI;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private llmClients: LLMClients = {};

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue('analysis') private analysisQueue: Queue,
  ) {
    this.initializeLLMClients();
  }

  private initializeLLMClients() {
    // OpenAI
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.llmClients.openai = new OpenAI({ apiKey: openaiKey });
    }

    // Anthropic
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.llmClients.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    // Gemini
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.llmClients.gemini = new GoogleGenerativeAI(geminiKey);
    }
  }

  async startAnalysis(analysisDto: AnalysisJobDto, user: User): Promise<{ jobId: string; message: string }> {
    const { meetingId, llmProvider, model } = analysisDto;

    // Verificar que la reunión existe y pertenece a la organización
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id: meetingId,
        organizationId: user.organizationId,
      },
      include: {
        transcript: true,
        organization: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada');
    }

    if (!meeting.transcript) {
      throw new BadRequestException('La reunión debe tener transcripción antes de analizar');
    }

    // Determinar proveedor LLM
    const finalProvider = llmProvider || meeting.organization.defaultLlmProvider;
    
    // Obtener API key (usuario personal o de la organización)
    const apiKey = await this.getApiKey(finalProvider, user);
    if (!apiKey) {
      throw new BadRequestException(`No se encontró API key para ${finalProvider}. Configúrala en tu perfil o contacta al administrador.`);
    }

    // Actualizar estado de la reunión
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.ANALYZING },
    });

    // Agregar job a la cola
    const job = await this.analysisQueue.add(
      'analyze-transcript',
      {
        ...analysisDto,
        userId: user.id,
        organizationId: user.organizationId,
        llmProvider: finalProvider,
        apiKey,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    return {
      jobId: job.id.toString(),
      message: 'Análisis iniciado. Recibirás una notificación cuando esté listo.',
    };
  }

  async processAnalysis(jobData: any): Promise<AnalysisResponseDto> {
    const { 
      meetingId, 
      llmProvider, 
      model, 
      apiKey,
      includeOratoryMetrics,
      includeSentimentAnalysis,
      includeRecommendations 
    } = jobData;

    try {
      this.logger.log(`Starting analysis for meeting ${meetingId} with ${llmProvider}`);

      // Obtener transcripción
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          transcript: true,
          participants: true,
        },
      });

      if (!meeting || !meeting.transcript) {
        throw new Error('Transcripción no encontrada');
      }

      const transcript = meeting.transcript;
      
      // Generar análisis con LLM
      const llmAnalysis = await this.generateLLMAnalysis(
        transcript.rawText,
        transcript.content as any[],
        llmProvider,
        model,
        apiKey,
        { includeSentimentAnalysis, includeRecommendations }
      );

      // Generar métricas de oratoria si se solicita
      let oratoryMetrics: OratoryMetrics | undefined;
      if (includeOratoryMetrics) {
        oratoryMetrics = this.generateOratoryMetrics(
          transcript.content as any[],
          meeting.participants || []
        );
      }

      // Guardar análisis en base de datos
      const savedAnalysis = await this.prisma.analysis.create({
        data: {
          meetingId,
          llmProvider,
          model: model || this.getDefaultModel(llmProvider),
          summary: llmAnalysis.summary,
          keyPoints: llmAnalysis.keyPoints,
          actionItems: llmAnalysis.actionItems,
          decisions: llmAnalysis.decisions,
          followUps: llmAnalysis.followUps,
          oratoryMetrics,
          rawResponse: llmAnalysis.rawResponse,
        },
      });

      // Actualizar estado de la reunión
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.COMPLETED },
      });

      this.logger.log(`Analysis completed for meeting ${meetingId}`);

      return {
        id: savedAnalysis.id,
        meetingId: savedAnalysis.meetingId,
        llmProvider: savedAnalysis.llmProvider,
        model: savedAnalysis.model,
        summary: savedAnalysis.summary,
        keyPoints: savedAnalysis.keyPoints as KeyPoint[],
        actionItems: savedAnalysis.actionItems as ActionItem[],
        decisions: savedAnalysis.decisions as Decision[],
        followUps: savedAnalysis.followUps as FollowUp[],
        oratoryMetrics: savedAnalysis.oratoryMetrics as OratoryMetrics,
        rawResponse: savedAnalysis.rawResponse,
        createdAt: savedAnalysis.createdAt,
        updatedAt: savedAnalysis.updatedAt,
      };

    } catch (error) {
      this.logger.error(`Analysis failed for meeting ${meetingId}:`, error);
      
      // Actualizar estado de error en la reunión
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.ERROR },
      });

      throw new InternalServerErrorException('Error en el análisis: ' + (error as Error).message);
    }
  }

  private async generateLLMAnalysis(
    rawText: string,
    segments: any[],
    provider: LlmProvider,
    model: string | undefined,
    apiKey: string,
    options: { includeSentimentAnalysis: boolean; includeRecommendations: boolean }
  ): Promise<{
    summary: string;
    keyPoints: KeyPoint[];
    actionItems: ActionItem[];
    decisions: Decision[];
    followUps: FollowUp[];
    rawResponse: any;
  }> {
    const prompt = this.buildAnalysisPrompt(rawText, options);

    let response: any;
    let finalModel: string;

    switch (provider) {
      case LlmProvider.OPENAI:
        const openai = new OpenAI({ apiKey });
        finalModel = model || 'gpt-4o';
        response = await openai.chat.completions.create({
          model: finalModel,
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente experto en análisis de reuniones. Analiza la transcripción y proporciona un análisis estructurado y útil.',
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });
        break;

      case LlmProvider.ANTHROPIC:
        const anthropic = new Anthropic({ apiKey });
        finalModel = model || 'claude-3-5-sonnet-20241022';
        response = await anthropic.messages.create({
          model: finalModel,
          max_tokens: 4000,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        });
        break;

      case LlmProvider.GEMINI:
        const gemini = new GoogleGenerativeAI(apiKey);
        const geminiModel = gemini.getGenerativeModel({ model: model || 'gemini-1.5-pro' });
        finalModel = model || 'gemini-1.5-pro';
        response = await geminiModel.generateContent(prompt);
        break;

      default:
        throw new Error(`Proveedor LLM no soportado: ${provider}`);
    }

    // Parsear respuesta según el proveedor
    const analysisText = this.extractResponseText(response, provider);
    const parsedAnalysis = this.parseAnalysisResponse(analysisText);

    return {
      ...parsedAnalysis,
      rawResponse: response,
    };
  }

  private buildAnalysisPrompt(rawText: string, options: any): string {
    const sentimentSection = options.includeSentimentAnalysis 
      ? '\n- Análisis de sentimientos: Evalúa el tono general y momentos clave'
      : '';
    
    const recommendationsSection = options.includeRecommendations
      ? '\n- Recomendaciones: Sugiere mejoras para futuras reuniones'
      : '';

    return `
Analiza la siguiente transcripción de reunión y proporciona un análisis estructurado en formato JSON.

TRANSCRIPCIÓN:
${rawText}

Por favor, proporciona el análisis en el siguiente formato JSON:
{
  "summary": "Resumen ejecutivo de la reunión (máximo 300 palabras)",
  "keyPoints": [
    {
      "topic": "Tema principal",
      "summary": "Resumen del punto",
      "importance": 8
    }
  ],
  "actionItems": [
    {
      "task": "Descripción de la tarea",
      "assignee": "Responsable (si se menciona)",
      "priority": "high|medium|low",
      "dueDate": "Fecha límite (si se menciona)"
    }
  ],
  "decisions": [
    {
      "decision": "Decisión tomada",
      "reasoning": "Justificación",
      "participants": ["Participante1", "Participante2"]
    }
  ],
  "followUps": [
    {
      "action": "Acción de seguimiento",
      "responsible": "Responsable",
      "timeline": "Plazo estimado"
    }
  ]${sentimentSection}${recommendationsSection}
}

INSTRUCCIONES:
- Sé conciso pero completo
- Prioriza información accionable
- Usa nombres reales de participantes cuando estén disponibles
- Clasifica la importancia de 1-10 para keyPoints
- Incluye solo decisiones explícitas, no suposiciones
`;
  }

  private extractResponseText(response: any, provider: LlmProvider): string {
    switch (provider) {
      case LlmProvider.OPENAI:
        return response.choices[0]?.message?.content || '';
      case LlmProvider.ANTHROPIC:
        return response.content[0]?.text || '';
      case LlmProvider.GEMINI:
        return response.response?.text() || '';
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  private parseAnalysisResponse(analysisText: string): {
    summary: string;
    keyPoints: KeyPoint[];
    actionItems: ActionItem[];
    decisions: Decision[];
    followUps: FollowUp[];
  } {
    try {
      const parsed = JSON.parse(analysisText);
      return {
        summary: parsed.summary || 'Sin resumen disponible',
        keyPoints: parsed.keyPoints || [],
        actionItems: parsed.actionItems || [],
        decisions: parsed.decisions || [],
        followUps: parsed.followUps || [],
      };
    } catch (error) {
      this.logger.error('Error parsing analysis response:', error);
      return {
        summary: 'Error al procesar el análisis',
        keyPoints: [],
        actionItems: [],
        decisions: [],
        followUps: [],
      };
    }
  }

  private generateOratoryMetrics(segments: any[], participants: any[]): OratoryMetrics {
    const speakerStats: Record<string, any> = {};
    let totalDuration = 0;
    let totalWords = 0;

    // Procesar segmentos de transcripción
    for (const segment of segments) {
      const speaker = segment.speaker || 'Unknown';
      const wordCount = segment.text.split(' ').length;
      const duration = 30; // Estimación básica, se podría mejorar

      if (!speakerStats[speaker]) {
        speakerStats[speaker] = {
          speakingTime: 0,
          wordCount: 0,
          turnCount: 0,
          fillerWordCount: 0,
        };
      }

      speakerStats[speaker].speakingTime += duration;
      speakerStats[speaker].wordCount += wordCount;
      speakerStats[speaker].turnCount += 1;
      speakerStats[speaker].fillerWordCount += this.countFillerWords(segment.text);

      totalDuration += duration;
      totalWords += wordCount;
    }

    // Calcular métricas finales
    const speakerParticipation: Record<string, any> = {};
    for (const [speaker, stats] of Object.entries(speakerStats)) {
      speakerParticipation[speaker] = {
        speakingTime: stats.speakingTime,
        percentage: (stats.speakingTime / totalDuration) * 100,
        wordCount: stats.wordCount,
        averageWordsPerMinute: (stats.wordCount / stats.speakingTime) * 60,
        fillerWordCount: stats.fillerWordCount,
        turnCount: stats.turnCount,
      };
    }

    const totalSpeakers = Object.keys(speakerStats).length;
    const balanceScore = this.calculateBalanceScore(speakerParticipation);
    const interactionScore = this.calculateInteractionScore(segments);

    return {
      totalSpeakers,
      speakerParticipation,
      meetingPace: {
        fast: 30,
        normal: 60,
        slow: 10,
      },
      interactionScore,
      balanceScore,
    };
  }

  private countFillerWords(text: string): number {
    const fillerWords = ['eh', 'um', 'uh', 'este', 'emm', 'mmm', 'bueno', 'entonces'];
    const words = text.toLowerCase().split(' ');
    return words.filter(word => fillerWords.includes(word)).length;
  }

  private calculateBalanceScore(participation: Record<string, any>): number {
    const participations = Object.values(participation).map((p: any) => p.percentage);
    const idealPercentage = 100 / participations.length;
    const variance = participations.reduce((sum: number, p: any) => 
      sum + Math.abs(p - idealPercentage), 0) / participations.length;
    return Math.max(1, 10 - (variance / 10));
  }

  private calculateInteractionScore(segments: any[]): number {
    let transitions = 0;
    let previousSpeaker = '';

    for (const segment of segments) {
      if (previousSpeaker && segment.speaker !== previousSpeaker) {
        transitions++;
      }
      previousSpeaker = segment.speaker;
    }

    // Normalizar basado en duración estimada
    const estimatedMinutes = segments.length / 2; // Estimación muy básica
    const transitionsPerMinute = transitions / estimatedMinutes;
    
    return Math.min(10, Math.max(1, transitionsPerMinute * 2));
  }

  private async getApiKey(provider: LlmProvider, user: User): Promise<string | null> {
    // Primero verificar API key personal del usuario
    switch (provider) {
      case LlmProvider.OPENAI:
        return user.openaiApiKey || this.configService.get<string>('OPENAI_API_KEY');
      case LlmProvider.ANTHROPIC:
        return user.anthropicApiKey || this.configService.get<string>('ANTHROPIC_API_KEY');
      case LlmProvider.GEMINI:
        return user.geminiApiKey || this.configService.get<string>('GEMINI_API_KEY');
      default:
        return null;
    }
  }

  private getDefaultModel(provider: LlmProvider): string {
    switch (provider) {
      case LlmProvider.OPENAI:
        return 'gpt-4o';
      case LlmProvider.ANTHROPIC:
        return 'claude-3-5-sonnet-20241022';
      case LlmProvider.GEMINI:
        return 'gemini-1.5-pro';
      default:
        return 'unknown';
    }
  }

  async getJobStatus(jobId: string, user: User): Promise<AnalysisJobStatusDto> {
    const job = await this.analysisQueue.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException('Job de análisis no encontrado');
    }

    if (job.data.organizationId !== user.organizationId) {
      throw new NotFoundException('Job de análisis no encontrado');
    }

    const status = await job.getState();
    const progress = job.progress();

    const response: AnalysisJobStatusDto = {
      jobId: job.id.toString(),
      meetingId: job.data.meetingId,
      status,
      progress: typeof progress === 'number' ? progress : 0,
    };

    if (status === 'completed' && job.returnvalue) {
      response.result = job.returnvalue;
    } else if (status === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    return response;
  }

  async getAnalysis(meetingId: string, user: User): Promise<AnalysisResponseDto | null> {
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id: meetingId,
        organizationId: user.organizationId,
      },
      include: {
        analysis: true,
      },
    });

    if (!meeting || !meeting.analysis) {
      return null;
    }

    const analysis = meeting.analysis;
    return {
      id: analysis.id,
      meetingId: analysis.meetingId,
      llmProvider: analysis.llmProvider,
      model: analysis.model,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints as KeyPoint[],
      actionItems: analysis.actionItems as ActionItem[],
      decisions: analysis.decisions as Decision[],
      followUps: analysis.followUps as FollowUp[],
      oratoryMetrics: analysis.oratoryMetrics as OratoryMetrics,
      rawResponse: analysis.rawResponse,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}