import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface TemplateConfig {
  defaultDuration?: number;
  suggestedAgenda?: string[];
  extractionRules?: {
    actionItemKeywords?: string[];
    decisionKeywords?: string[];
    focusTopics?: string[];
  };
  promptOverrides?: {
    summaryStyle?: 'brief' | 'detailed' | 'executive';
    extractionFocus?: string[];
  };
  autoCreateTasks?: boolean;
  autoShare?: {
    emails?: string[];
    slackChannel?: string;
  };
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all templates for an organization (including defaults)
   */
  async getTemplates(organizationId: string): Promise<any[]> {
    const customTemplates = await this.prisma.meetingTemplate.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Merge with system defaults
    const systemTemplates = this.getSystemTemplates();
    const customTypes = customTemplates.map((t) => t.type);
    
    const defaults = systemTemplates.filter(
      (t) => !customTypes.includes(t.type),
    );

    return [...customTemplates, ...defaults];
  }

  /**
   * Create a custom template
   */
  async createTemplate(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      type: string;
      icon?: string;
      config: TemplateConfig;
    },
  ) {
    return this.prisma.meetingTemplate.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        type: data.type as any,
        icon: data.icon,
        defaultDuration: data.config.defaultDuration,
        suggestedAgenda: data.config.suggestedAgenda,
        extractionRules: data.config.extractionRules,
        promptOverrides: data.config.promptOverrides,
        autoCreateTasks: data.config.autoCreateTasks ?? true,
        autoShare: data.config.autoShare,
      },
    });
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      config: TemplateConfig;
      isDefault: boolean;
    }>,
  ) {
    const template = await this.prisma.meetingTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.meetingTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        ...(data.config && {
          defaultDuration: data.config.defaultDuration,
          suggestedAgenda: data.config.suggestedAgenda,
          extractionRules: data.config.extractionRules,
          promptOverrides: data.config.promptOverrides,
          autoCreateTasks: data.config.autoCreateTasks,
          autoShare: data.config.autoShare,
        }),
      },
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, organizationId: string) {
    const template = await this.prisma.meetingTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.meetingTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * Get template by ID or type
   */
  async getTemplate(
    organizationId: string,
    idOrType: string,
  ): Promise<any | null> {
    // Try to find by ID first
    const byId = await this.prisma.meetingTemplate.findFirst({
      where: {
        id: idOrType,
        organizationId,
      },
    });

    if (byId) return byId;

    // Try to find by type
    const byType = await this.prisma.meetingTemplate.findFirst({
      where: {
        type: idOrType as any,
        organizationId,
      },
    });

    if (byType) return byType;

    // Return system default if exists
    const systemTemplate = this.getSystemTemplates().find(
      (t) => t.type === idOrType,
    );

    return systemTemplate || null;
  }

  /**
   * System default templates
   */
  private getSystemTemplates(): Array<{
    type: string;
    name: string;
    description: string;
    icon: string;
    defaultDuration: number;
    suggestedAgenda: string[];
    extractionRules: any;
    promptOverrides: any;
  }> {
    return [
      {
        type: 'ONE_ON_ONE',
        name: '1:1 Meeting',
        description: 'One-on-one meetings between manager and direct report',
        icon: '👥',
        defaultDuration: 30,
        suggestedAgenda: [
          'Check-in: ¿Cómo estás?',
          'Progreso de proyectos',
          'Bloqueos y desafíos',
          'Desarrollo profesional',
          'Feedback bidireccional',
          'Action items para la próxima semana',
        ],
        extractionRules: {
          actionItemKeywords: ['voy a', 'me comprometo', 'para la próxima'],
          focusTopics: ['desarrollo', 'carrera', 'feedback', 'objetivos'],
        },
        promptOverrides: {
          summaryStyle: 'brief',
          extractionFocus: ['commitments', 'concerns', 'feedback'],
        },
      },
      {
        type: 'STANDUP',
        name: 'Daily Standup',
        description: 'Quick daily sync meeting',
        icon: '🚀',
        defaultDuration: 15,
        suggestedAgenda: [
          '¿Qué hice ayer?',
          '¿Qué haré hoy?',
          '¿Tengo bloqueos?',
        ],
        extractionRules: {
          actionItemKeywords: ['hoy voy a', 'necesito', 'bloqueado por'],
          focusTopics: ['blockers', 'progress', 'help needed'],
        },
        promptOverrides: {
          summaryStyle: 'brief',
          extractionFocus: ['blockers', 'commitments', 'help-requests'],
        },
      },
      {
        type: 'SPRINT_PLANNING',
        name: 'Sprint Planning',
        description: 'Agile sprint planning session',
        icon: '📋',
        defaultDuration: 60,
        suggestedAgenda: [
          'Review del sprint anterior',
          'Objetivo del sprint',
          'Refinamiento de backlog',
          'Estimación y compromiso',
          'Capacidad del equipo',
        ],
        extractionRules: {
          actionItemKeywords: ['sprint goal', 'story points', 'committed to'],
          decisionKeywords: ['decidimos', 'acordamos', 'prioridad'],
        },
        promptOverrides: {
          summaryStyle: 'detailed',
          extractionFocus: ['sprint-goals', 'commitments', 'capacity'],
        },
      },
      {
        type: 'RETROSPECTIVE',
        name: 'Retrospective',
        description: 'Team retrospective meeting',
        icon: '🔄',
        defaultDuration: 45,
        suggestedAgenda: [
          '¿Qué salió bien?',
          '¿Qué podemos mejorar?',
          '¿Qué vamos a intentar diferente?',
          'Action items de mejora',
        ],
        extractionRules: {
          actionItemKeywords: ['vamos a intentar', 'mejora', 'experimento'],
          focusTopics: ['wins', 'improvements', 'experiments'],
        },
        promptOverrides: {
          summaryStyle: 'detailed',
          extractionFocus: ['wins', 'improvements', 'action-items'],
        },
      },
      {
        type: 'BRAINSTORM',
        name: 'Brainstorming',
        description: 'Creative ideation session',
        icon: '💡',
        defaultDuration: 60,
        suggestedAgenda: [
          'Definir el problema',
          'Generación de ideas (sin juzgar)',
          'Agrupación de ideas',
          'Votación y priorización',
          'Próximos pasos',
        ],
        extractionRules: {
          focusTopics: ['ideas', 'votes', 'selected'],
        },
        promptOverrides: {
          summaryStyle: 'detailed',
          extractionFocus: ['ideas', 'decisions', 'next-steps'],
        },
      },
      {
        type: 'CLIENT_CALL',
        name: 'Client Call',
        description: 'Meeting with external clients',
        icon: '🤝',
        defaultDuration: 45,
        suggestedAgenda: [
          'Introducción',
          'Revisión de proyecto/producto',
          'Feedback del cliente',
          'Próximos pasos',
          'Preguntas',
        ],
        extractionRules: {
          actionItemKeywords: ['enviaremos', 'prometemos', 'deadline'],
          decisionKeywords: ['acordamos', 'el cliente quiere', 'aprobado'],
        },
        promptOverrides: {
          summaryStyle: 'executive',
          extractionFocus: ['client-feedback', 'commitments', 'decisions'],
        },
      },
      {
        type: 'INTERVIEW',
        name: 'Interview',
        description: 'Job interview or candidate assessment',
        icon: '🎯',
        defaultDuration: 60,
        suggestedAgenda: [
          'Introducción',
          'Experiencia y background',
          'Preguntas técnicas/situacionales',
          'Cultura y valores',
          'Preguntas del candidato',
        ],
        extractionRules: {
          focusTopics: ['skills', 'experience', 'culture-fit', 'red-flags'],
        },
        promptOverrides: {
          summaryStyle: 'detailed',
          extractionFocus: ['candidate-assessment', 'strengths', 'concerns'],
        },
      },
      {
        type: 'ALL_HANDS',
        name: 'All Hands',
        description: 'Company-wide meeting',
        icon: '🏢',
        defaultDuration: 60,
        suggestedAgenda: [
          'Actualizaciones de liderazgo',
          'Métricas y resultados',
          'Reconocimientos',
          'Próximos hitos',
          'Q&A',
        ],
        extractionRules: {
          focusTopics: ['announcements', 'metrics', 'recognition'],
        },
        promptOverrides: {
          summaryStyle: 'executive',
          extractionFocus: ['announcements', 'metrics', 'qa'],
        },
      },
    ];
  }
}
