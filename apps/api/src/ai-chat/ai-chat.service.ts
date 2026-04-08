import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    timestamp: number;
    speaker: string;
    text: string;
  }>;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Chat with a meeting - ask questions, get insights, search content
   */
  async chat(
    meetingId: string,
    userId: string,
    question: string,
    sessionId?: string,
  ): Promise<{ response: string; citations: any[]; sessionId: string }> {
    // Get meeting with transcript
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        transcript: true,
        analysis: true,
        participants: true,
      },
    });

    if (!meeting || !meeting.transcript) {
      throw new NotFoundException('Meeting or transcript not found');
    }

    // Get or create chat session
    let session = sessionId
      ? await this.prisma.aiChatSession.findUnique({
          where: { id: sessionId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        })
      : null;

    if (!session) {
      session = await this.prisma.aiChatSession.create({
        data: {
          meetingId,
          userId,
        },
        include: { messages: true },
      });
    }

    // Build context
    const transcript = meeting.transcript.content as any[];
    const formattedTranscript = transcript
      .map((s: any) => `[${this.formatTime(s.timestamp)}] ${s.speaker}: ${s.text}`)
      .join('\n');

    const analysisContext = meeting.analysis
      ? `
RESUMEN: ${meeting.analysis.summary}

PUNTOS CLAVE: ${JSON.stringify(meeting.analysis.keyPoints)}

DECISIONES: ${JSON.stringify(meeting.analysis.decisions)}

ACTION ITEMS: ${JSON.stringify(meeting.analysis.actionItems)}
`
      : '';

    // Build chat history
    const chatHistory = session.messages
      .map((m) => `${m.role === 'USER' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `Eres un asistente inteligente que ayuda a los usuarios a entender y extraer información de reuniones.

INFORMACIÓN DE LA REUNIÓN:
Título: ${meeting.title}
Fecha: ${meeting.scheduledAt || meeting.createdAt}
Duración: ${meeting.duration || Math.round((meeting.audioDuration || 0) / 60)} minutos
Participantes: ${meeting.participants.map((p) => p.name || p.speakerLabel).join(', ')}

TRANSCRIPCIÓN COMPLETA:
${formattedTranscript}

${analysisContext}

HISTORIAL DE CHAT:
${chatHistory}

INSTRUCCIONES:
1. Responde preguntas basándote ÚNICAMENTE en el contenido de la reunión
2. Cuando cites algo específico, incluye el timestamp y quién lo dijo
3. Si te preguntan algo que no está en la reunión, dilo claramente
4. Sé conciso pero completo
5. Puedes hacer análisis y conexiones entre diferentes partes de la reunión
6. Si detectas contradicciones o temas pendientes, menciónalo

FORMATO DE RESPUESTA:
Responde en JSON con este formato:
{
  "response": "Tu respuesta aquí",
  "citations": [
    {"timestamp": 120, "speaker": "Speaker 1", "text": "cita relevante"}
  ]
}

Solo incluye citations si citas algo específico de la transcripción.`;

    try {
      const geminiKey = this.config.get('GEMINI_API_KEY');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `PREGUNTA DEL USUARIO: ${question}` },
      ]);

      const responseText = result.response.text();
      const parsed = this.parseResponse(responseText);

      // Save messages
      await this.prisma.aiChatMessage.createMany({
        data: [
          {
            sessionId: session.id,
            role: 'USER',
            content: question,
          },
          {
            sessionId: session.id,
            role: 'ASSISTANT',
            content: parsed.response,
            citations: parsed.citations.length > 0 ? parsed.citations : undefined,
          },
        ],
      });

      return {
        response: parsed.response,
        citations: parsed.citations,
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error('AI Chat failed', error);
      throw new Error(`Chat failed: ${error.message}`);
    }
  }

  /**
   * Get chat history for a session
   */
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const messages = await this.prisma.aiChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
      citations: m.citations as any,
    }));
  }

  /**
   * Suggested questions based on meeting content
   */
  async getSuggestedQuestions(meetingId: string): Promise<string[]> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { analysis: true },
    });

    if (!meeting?.analysis) {
      return [
        '¿Cuáles fueron los puntos principales de la reunión?',
        '¿Qué tareas quedaron pendientes?',
        '¿Quién participó más en la discusión?',
      ];
    }

    const analysis = meeting.analysis;
    const suggestions = [
      '¿Cuál fue el tema más importante discutido?',
      '¿Qué decisiones se tomaron y quién las propuso?',
    ];

    const actionItems = analysis.actionItems as any[];
    if (actionItems?.length > 0) {
      suggestions.push('¿Cuáles son las tareas más urgentes?');
      suggestions.push('¿Quién tiene más responsabilidades asignadas?');
    }

    const followUps = analysis.followUps as any[];
    if (followUps?.length > 0) {
      suggestions.push('¿Qué temas quedaron pendientes para la próxima reunión?');
    }

    return suggestions.slice(0, 5);
  }

  private parseResponse(response: string): { response: string; citations: any[] } {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

    try {
      const parsed = JSON.parse(cleaned);
      return {
        response: parsed.response || cleaned,
        citations: parsed.citations || [],
      };
    } catch {
      return { response: cleaned, citations: [] };
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
