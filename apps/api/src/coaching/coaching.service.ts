import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CoachingInsight {
  category: string;
  insight: string;
  importance: 'high' | 'medium' | 'low';
  actionable: string;
}

export interface PersonalReport {
  period: { start: Date; end: Date };
  meetingCount: number;
  totalMinutes: number;
  averageParticipation: number;
  averageSpeakingPace: number;
  fillerWordRate: number;
  sentimentTrend: number;
  strengths: string[];
  improvements: string[];
  tips: CoachingInsight[];
  weeklyProgress: Array<{
    week: string;
    participation: number;
    pace: number;
    fillers: number;
  }>;
}

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate a personal coaching report for a user
   */
  async generateReport(
    userId: string,
    days = 30,
  ): Promise<PersonalReport> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get user's meetings in the period
    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'COMPLETED',
        createdAt: { gte: since },
        participants: {
          some: {
            OR: [
              { email: user.email },
              { name: { contains: user.name || '', mode: 'insensitive' } },
            ],
          },
        },
      },
      include: {
        participants: true,
        analysis: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (meetings.length === 0) {
      return this.emptyReport(since, new Date());
    }

    // Calculate aggregated metrics
    const userParticipations: number[] = [];
    const speakingPaces: number[] = [];
    const fillerRates: number[] = [];
    const sentiments: number[] = [];
    let totalMinutes = 0;

    for (const meeting of meetings) {
      const userParticipant = meeting.participants.find(
        (p) =>
          p.email === user.email ||
          p.name?.toLowerCase().includes(user.name?.toLowerCase() || ''),
      );

      if (userParticipant) {
        const totalWords = meeting.participants.reduce(
          (sum, p) => sum + p.wordCount,
          0,
        );
        const participation = totalWords > 0
          ? (userParticipant.wordCount / totalWords) * 100
          : 0;

        userParticipations.push(participation);

        if (userParticipant.wordsPerMinute) {
          speakingPaces.push(userParticipant.wordsPerMinute);
        }

        // Calculate filler word rate
        const fillerWords = userParticipant.fillerWords as Record<string, number> | null;
        if (fillerWords && userParticipant.wordCount > 0) {
          const totalFillers = Object.values(fillerWords).reduce(
            (sum, count) => sum + count,
            0,
          );
          fillerRates.push((totalFillers / userParticipant.wordCount) * 100);
        }

        if (userParticipant.sentimentScore !== null) {
          sentiments.push(userParticipant.sentimentScore);
        }

        totalMinutes += meeting.duration || Math.round((meeting.audioDuration || 0) / 60);
      }
    }

    // Calculate averages
    const avgParticipation = this.average(userParticipations);
    const avgSpeakingPace = this.average(speakingPaces);
    const avgFillerRate = this.average(fillerRates);
    const avgSentiment = this.average(sentiments);

    // Generate AI insights
    const insights = await this.generateAiInsights({
      meetingCount: meetings.length,
      avgParticipation,
      avgSpeakingPace,
      avgFillerRate,
      avgSentiment,
    });

    // Calculate weekly progress
    const weeklyProgress = this.calculateWeeklyProgress(meetings, user);

    // Save the report
    await this.prisma.coachingReport.create({
      data: {
        userId,
        periodStart: since,
        periodEnd: new Date(),
        meetingCount: meetings.length,
        avgSpeakingPace,
        avgFillerWordRate: avgFillerRate,
        avgParticipation,
        avgSentiment,
        strengths: insights.strengths,
        improvements: insights.improvements,
        tips: insights.tips,
      },
    });

    return {
      period: { start: since, end: new Date() },
      meetingCount: meetings.length,
      totalMinutes,
      averageParticipation: avgParticipation,
      averageSpeakingPace: avgSpeakingPace,
      fillerWordRate: avgFillerRate,
      sentimentTrend: avgSentiment,
      strengths: insights.strengths,
      improvements: insights.improvements,
      tips: insights.tips,
      weeklyProgress,
    };
  }

  /**
   * Get quick feedback after a single meeting
   */
  async getMeetingFeedback(
    meetingId: string,
    userId: string,
  ): Promise<{
    score: number;
    highlights: string[];
    improvements: string[];
    comparison: { metric: string; you: number; average: number }[];
  }> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: true,
        analysis: true,
      },
    });

    if (!meeting) throw new Error('Meeting not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const userParticipant = meeting.participants.find(
      (p) =>
        p.email === user.email ||
        p.name?.toLowerCase().includes(user.name?.toLowerCase() || ''),
    );

    if (!userParticipant) {
      return {
        score: 0,
        highlights: [],
        improvements: ['No participaste en esta reunión o no se te identificó'],
        comparison: [],
      };
    }

    // Calculate metrics
    const totalWords = meeting.participants.reduce((sum, p) => sum + p.wordCount, 0);
    const avgWordsPerParticipant = totalWords / meeting.participants.length;
    const avgPace =
      meeting.participants.reduce((sum, p) => sum + (p.wordsPerMinute || 0), 0) /
      meeting.participants.length;

    const participation = (userParticipant.wordCount / totalWords) * 100;
    const expectedParticipation = 100 / meeting.participants.length;

    // Calculate score (0-100)
    let score = 70; // Base score

    // Participation balance (±15 points)
    const participationDiff = Math.abs(participation - expectedParticipation);
    score += Math.max(0, 15 - participationDiff);

    // Speaking pace (±10 points) - ideal is 120-150 wpm
    const pace = userParticipant.wordsPerMinute || 0;
    if (pace >= 120 && pace <= 150) score += 10;
    else if (pace >= 100 && pace <= 170) score += 5;

    // Filler words (±5 points)
    const fillerWords = userParticipant.fillerWords as Record<string, number> | null;
    const totalFillers = fillerWords
      ? Object.values(fillerWords).reduce((sum, c) => sum + c, 0)
      : 0;
    const fillerRate = userParticipant.wordCount > 0
      ? (totalFillers / userParticipant.wordCount) * 100
      : 0;
    if (fillerRate < 2) score += 5;
    else if (fillerRate < 5) score += 2;

    score = Math.min(100, Math.max(0, score));

    // Generate feedback
    const highlights: string[] = [];
    const improvements: string[] = [];

    if (participation >= expectedParticipation * 0.8 && participation <= expectedParticipation * 1.2) {
      highlights.push('Excelente balance de participación');
    } else if (participation < expectedParticipation * 0.5) {
      improvements.push('Intenta participar más activamente en las discusiones');
    } else if (participation > expectedParticipation * 1.5) {
      improvements.push('Considera dar más espacio a otros participantes');
    }

    if (pace >= 120 && pace <= 150) {
      highlights.push('Ritmo de habla claro y fácil de seguir');
    } else if (pace > 170) {
      improvements.push('Intenta hablar un poco más despacio para mayor claridad');
    } else if (pace < 100) {
      improvements.push('Podrías aumentar ligeramente tu ritmo de habla');
    }

    if (fillerRate < 2) {
      highlights.push('Discurso fluido con pocas muletillas');
    } else if (fillerRate > 5) {
      improvements.push('Trabaja en reducir el uso de muletillas');
    }

    if (userParticipant.questionsAsked > 0) {
      highlights.push(`Hiciste ${userParticipant.questionsAsked} preguntas relevantes`);
    }

    return {
      score: Math.round(score),
      highlights,
      improvements,
      comparison: [
        {
          metric: 'Participación',
          you: Math.round(participation),
          average: Math.round(100 / meeting.participants.length),
        },
        {
          metric: 'Palabras/min',
          you: Math.round(pace),
          average: Math.round(avgPace),
        },
        {
          metric: 'Palabras totales',
          you: userParticipant.wordCount,
          average: Math.round(avgWordsPerParticipant),
        },
      ],
    };
  }

  /**
   * Get personalized tips based on user's history
   */
  async getPersonalizedTips(userId: string): Promise<CoachingInsight[]> {
    const latestReport = await this.prisma.coachingReport.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestReport) {
      return [
        {
          category: 'General',
          insight: 'Participa en más reuniones para obtener feedback personalizado',
          importance: 'medium',
          actionable: 'Sube tu primera reunión para comenzar a recibir insights',
        },
      ];
    }

    return latestReport.tips as CoachingInsight[];
  }

  private async generateAiInsights(metrics: {
    meetingCount: number;
    avgParticipation: number;
    avgSpeakingPace: number;
    avgFillerRate: number;
    avgSentiment: number;
  }): Promise<{
    strengths: string[];
    improvements: string[];
    tips: CoachingInsight[];
  }> {
    const geminiKey = this.config.get('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analiza estas métricas de comunicación en reuniones y genera feedback constructivo.

MÉTRICAS:
- Reuniones analizadas: ${metrics.meetingCount}
- Participación promedio: ${metrics.avgParticipation.toFixed(1)}%
- Velocidad de habla: ${metrics.avgSpeakingPace.toFixed(0)} palabras/min (ideal: 120-150)
- Tasa de muletillas: ${metrics.avgFillerRate.toFixed(1)}% (ideal: <2%)
- Sentimiento promedio: ${metrics.avgSentiment.toFixed(2)} (-1 negativo a 1 positivo)

Genera una respuesta JSON con este formato:
{
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "improvements": ["área de mejora 1", "área de mejora 2"],
  "tips": [
    {
      "category": "Participación|Claridad|Ritmo|Presencia",
      "insight": "observación específica",
      "importance": "high|medium|low",
      "actionable": "acción concreta que puede tomar"
    }
  ]
}

Sé específico, constructivo y práctico. Responde SOLO con JSON válido.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Failed to generate AI insights', error);
      return {
        strengths: ['Participación consistente en reuniones'],
        improvements: ['Continúa trabajando en tu comunicación'],
        tips: [
          {
            category: 'General',
            insight: 'Mantén un ritmo de habla constante',
            importance: 'medium',
            actionable: 'Practica pausas naturales entre ideas',
          },
        ],
      };
    }
  }

  private calculateWeeklyProgress(
    meetings: any[],
    user: any,
  ): Array<{
    week: string;
    participation: number;
    pace: number;
    fillers: number;
  }> {
    const weeklyData: Map<
      string,
      { participations: number[]; paces: number[]; fillers: number[] }
    > = new Map();

    for (const meeting of meetings) {
      const weekStart = this.getWeekStart(meeting.createdAt);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { participations: [], paces: [], fillers: [] });
      }

      const userParticipant = meeting.participants.find(
        (p: any) =>
          p.email === user.email ||
          p.name?.toLowerCase().includes(user.name?.toLowerCase() || ''),
      );

      if (userParticipant) {
        const totalWords = meeting.participants.reduce(
          (sum: number, p: any) => sum + p.wordCount,
          0,
        );
        const data = weeklyData.get(weekKey)!;

        if (totalWords > 0) {
          data.participations.push((userParticipant.wordCount / totalWords) * 100);
        }
        if (userParticipant.wordsPerMinute) {
          data.paces.push(userParticipant.wordsPerMinute);
        }

        const fillerWords = userParticipant.fillerWords as Record<string, number> | null;
        if (fillerWords && userParticipant.wordCount > 0) {
          const totalFillers = Object.values(fillerWords).reduce(
            (sum, count) => sum + count,
            0,
          );
          data.fillers.push((totalFillers / userParticipant.wordCount) * 100);
        }
      }
    }

    return Array.from(weeklyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        participation: this.average(data.participations),
        pace: this.average(data.paces),
        fillers: this.average(data.fillers),
      }));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private emptyReport(start: Date, end: Date): PersonalReport {
    return {
      period: { start, end },
      meetingCount: 0,
      totalMinutes: 0,
      averageParticipation: 0,
      averageSpeakingPace: 0,
      fillerWordRate: 0,
      sentimentTrend: 0,
      strengths: [],
      improvements: ['Participa en reuniones para obtener feedback'],
      tips: [],
      weeklyProgress: [],
    };
  }
}
