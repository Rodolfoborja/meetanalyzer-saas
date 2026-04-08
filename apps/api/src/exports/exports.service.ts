import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

export interface ExportOptions {
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeOratoryMetrics?: boolean;
  includeParticipants?: boolean;
  language?: 'es' | 'en';
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private integrations: IntegrationsService,
  ) {}

  /**
   * Export meeting to Markdown
   */
  async exportToMarkdown(
    meetingId: string,
    options: ExportOptions = {},
  ): Promise<string> {
    const meeting = await this.getMeetingWithData(meetingId);
    const opts = this.getDefaultOptions(options);

    let markdown = `# ${meeting.title}\n\n`;
    markdown += `**Fecha:** ${this.formatDate(meeting.scheduledAt || meeting.createdAt)}\n`;
    markdown += `**Duración:** ${meeting.duration || Math.round((meeting.audioDuration || 0) / 60)} minutos\n`;
    markdown += `**Plataforma:** ${meeting.platform}\n\n`;

    if (opts.includeParticipants && meeting.participants.length) {
      markdown += `## Participantes\n\n`;
      for (const p of meeting.participants) {
        markdown += `- **${p.name || p.speakerLabel}**`;
        if (p.email) markdown += ` (${p.email})`;
        markdown += ` - ${p.wordCount} palabras, ${Math.round(p.speakingTime / 60)}min\n`;
      }
      markdown += '\n';
    }

    if (opts.includeSummary && meeting.analysis) {
      markdown += `## Resumen Ejecutivo\n\n${meeting.analysis.summary}\n\n`;

      const keyPoints = meeting.analysis.keyPoints as string[];
      if (keyPoints?.length) {
        markdown += `## Puntos Clave\n\n`;
        keyPoints.forEach((point) => {
          markdown += `- ${point}\n`;
        });
        markdown += '\n';
      }

      const decisions = meeting.analysis.decisions as string[];
      if (decisions?.length) {
        markdown += `## Decisiones\n\n`;
        decisions.forEach((decision) => {
          markdown += `- ${decision}\n`;
        });
        markdown += '\n';
      }
    }

    if (opts.includeActionItems) {
      const actionItems = meeting.actionItems;
      if (actionItems.length) {
        markdown += `## Action Items\n\n`;
        markdown += `| Tarea | Asignado | Prioridad | Estado | Fecha límite |\n`;
        markdown += `|-------|----------|-----------|--------|-------------|\n`;
        for (const item of actionItems) {
          markdown += `| ${item.title} | ${item.assigneeName || item.assignee?.name || '-'} | ${item.priority} | ${item.status} | ${item.dueDate ? this.formatDate(item.dueDate) : '-'} |\n`;
        }
        markdown += '\n';
      }
    }

    if (opts.includeOratoryMetrics && meeting.analysis?.oratoryMetrics) {
      const metrics = meeting.analysis.oratoryMetrics as any;
      markdown += `## Métricas de Oratoria\n\n`;

      if (metrics.participationBalance) {
        markdown += `### Participación\n\n`;
        for (const [speaker, percent] of Object.entries(metrics.participationBalance)) {
          markdown += `- ${speaker}: ${percent}%\n`;
        }
        markdown += '\n';
      }

      if (metrics.speakingPace) {
        markdown += `### Ritmo de Habla (palabras/min)\n\n`;
        for (const [speaker, pace] of Object.entries(metrics.speakingPace)) {
          markdown += `- ${speaker}: ${pace} ppm\n`;
        }
        markdown += '\n';
      }
    }

    if (opts.includeTranscript && meeting.transcript) {
      markdown += `## Transcripción Completa\n\n`;
      const segments = meeting.transcript.content as any[];
      for (const seg of segments) {
        markdown += `**[${this.formatTime(seg.timestamp)}] ${seg.speaker}:** ${seg.text}\n\n`;
      }
    }

    markdown += `---\n*Generado por Romelly AI - ${new Date().toISOString()}*\n`;

    return markdown;
  }

  /**
   * Export meeting to JSON (for programmatic use)
   */
  async exportToJson(meetingId: string): Promise<any> {
    const meeting = await this.getMeetingWithData(meetingId);
    
    return {
      id: meeting.id,
      title: meeting.title,
      date: meeting.scheduledAt || meeting.createdAt,
      duration: meeting.duration || Math.round((meeting.audioDuration || 0) / 60),
      platform: meeting.platform,
      participants: meeting.participants.map((p) => ({
        name: p.name || p.speakerLabel,
        email: p.email,
        wordCount: p.wordCount,
        speakingTimeSeconds: p.speakingTime,
        wordsPerMinute: p.wordsPerMinute,
      })),
      summary: meeting.analysis?.summary,
      keyPoints: meeting.analysis?.keyPoints,
      decisions: meeting.analysis?.decisions,
      actionItems: meeting.actionItems.map((item) => ({
        title: item.title,
        description: item.description,
        assignee: item.assigneeName || item.assignee?.name,
        priority: item.priority,
        status: item.status,
        dueDate: item.dueDate,
      })),
      transcript: meeting.transcript?.content,
      oratoryMetrics: meeting.analysis?.oratoryMetrics,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Export to Notion page
   */
  async exportToNotion(
    meetingId: string,
    organizationId: string,
    options: ExportOptions = {},
  ): Promise<{ pageId: string; url: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.notionIntegration) {
      throw new Error('Notion integration not configured');
    }

    const notionConfig = org.notionIntegration as { token: string; databaseId: string };
    const markdown = await this.exportToMarkdown(meetingId, options);
    const meeting = await this.getMeetingWithData(meetingId);

    const result = await this.integrations.createNotionPage(
      notionConfig.token,
      notionConfig.databaseId,
      {
        title: meeting.title,
        content: markdown,
        properties: {
          'Fecha': {
            date: { start: (meeting.scheduledAt || meeting.createdAt).toISOString().split('T')[0] },
          },
          'Duración': {
            number: meeting.duration || Math.round((meeting.audioDuration || 0) / 60),
          },
        },
      },
    );

    // Record export
    await this.prisma.export.create({
      data: {
        meetingId,
        format: 'NOTION',
        status: 'COMPLETED',
        fileUrl: result.url,
      },
    });

    return { pageId: result.id, url: result.url };
  }

  /**
   * Export action items to Linear
   */
  async exportToLinear(
    meetingId: string,
    linearApiKey: string,
    teamId: string,
  ): Promise<Array<{ actionItemId: string; linearIssueId: string; url: string }>> {
    const meeting = await this.getMeetingWithData(meetingId);
    const results: Array<{ actionItemId: string; linearIssueId: string; url: string }> = [];

    for (const item of meeting.actionItems) {
      if (item.linearIssueId) continue; // Skip if already synced

      try {
        const issue = await this.integrations.createLinearIssue(linearApiKey, {
          teamId,
          title: item.title,
          description: `**Fuente:** [${meeting.title}]\n\n${item.description || ''}\n\n---\n*Creado desde Romelly AI*`,
          priority: this.mapPriorityToLinear(item.priority),
        });

        await this.prisma.actionItem.update({
          where: { id: item.id },
          data: { linearIssueId: issue.id },
        });

        results.push({
          actionItemId: item.id,
          linearIssueId: issue.id,
          url: issue.url,
        });
      } catch (error) {
        this.logger.error(`Failed to create Linear issue for ${item.id}`, error);
      }
    }

    // Record export
    await this.prisma.export.create({
      data: {
        meetingId,
        format: 'LINEAR',
        status: 'COMPLETED',
        options: { teamId, issueCount: results.length },
      },
    });

    return results;
  }

  /**
   * Generate shareable link
   */
  async generateShareLink(meetingId: string): Promise<string> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) throw new NotFoundException('Meeting not found');

    let shareToken = meeting.shareToken;
    if (!shareToken) {
      shareToken = this.generateToken();
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { shareToken, isPublic: true },
      });
    }

    const baseUrl = this.config.get('APP_URL') || 'https://app.romelly.ai';
    return `${baseUrl}/shared/${shareToken}`;
  }

  /**
   * Get shared meeting (public access)
   */
  async getSharedMeeting(shareToken: string): Promise<any> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { shareToken },
      include: {
        transcript: true,
        analysis: true,
        participants: true,
        actionItems: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });

    if (!meeting || !meeting.isPublic) {
      throw new NotFoundException('Meeting not found or not shared');
    }

    // Return limited data for security
    return {
      title: meeting.title,
      date: meeting.scheduledAt || meeting.createdAt,
      duration: meeting.duration,
      participants: meeting.participants.map((p) => ({
        name: p.name || p.speakerLabel,
        wordCount: p.wordCount,
      })),
      summary: meeting.analysis?.summary,
      keyPoints: meeting.analysis?.keyPoints,
      actionItems: meeting.actionItems.map((item) => ({
        title: item.title,
        status: item.status,
        priority: item.priority,
      })),
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private async getMeetingWithData(meetingId: string): Promise<any> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        transcript: true,
        analysis: true,
        participants: true,
        actionItems: {
          include: { assignee: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  private getDefaultOptions(options: ExportOptions): Required<ExportOptions> {
    return {
      includeTranscript: options.includeTranscript ?? true,
      includeSummary: options.includeSummary ?? true,
      includeActionItems: options.includeActionItems ?? true,
      includeOratoryMetrics: options.includeOratoryMetrics ?? true,
      includeParticipants: options.includeParticipants ?? true,
      language: options.language ?? 'es',
    };
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private mapPriorityToLinear(priority: string): number {
    const map: Record<string, number> = {
      URGENT: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
    };
    return map[priority] || 3;
  }
}
