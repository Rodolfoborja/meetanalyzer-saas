import { ApiProperty } from '@nestjs/swagger';
import { LlmProvider } from '@prisma/client';

export interface ActionItem {
  task: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

export interface KeyPoint {
  topic: string;
  summary: string;
  importance: number; // 1-10
}

export interface Decision {
  decision: string;
  reasoning: string;
  participants: string[];
}

export interface FollowUp {
  action: string;
  responsible?: string;
  timeline?: string;
}

export interface OratoryMetrics {
  totalSpeakers: number;
  speakerParticipation: Record<string, {
    speakingTime: number;
    percentage: number;
    wordCount: number;
    averageWordsPerMinute: number;
    fillerWordCount: number;
    turnCount: number;
  }>;
  meetingPace: {
    fast: number;
    normal: number;
    slow: number;
  };
  interactionScore: number; // 1-10
  balanceScore: number; // 1-10
}

export class AnalysisResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  meetingId: string;

  @ApiProperty({ enum: LlmProvider })
  llmProvider: LlmProvider;

  @ApiProperty()
  model: string;

  @ApiProperty({ description: 'Resumen ejecutivo de la reunión' })
  summary: string;

  @ApiProperty({ description: 'Puntos clave discutidos' })
  keyPoints: KeyPoint[];

  @ApiProperty({ description: 'Lista de tareas y acciones' })
  actionItems: ActionItem[];

  @ApiProperty({ description: 'Decisiones tomadas' })
  decisions: Decision[];

  @ApiProperty({ description: 'Seguimientos pendientes' })
  followUps: FollowUp[];

  @ApiProperty({ description: 'Métricas de oratoria y participación', required: false })
  oratoryMetrics?: OratoryMetrics;

  @ApiProperty({ description: 'Respuesta cruda del LLM', required: false })
  rawResponse?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AnalysisJobStatusDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  meetingId: string;

  @ApiProperty({ description: 'Estado del job (waiting, active, completed, failed)' })
  status: string;

  @ApiProperty({ description: 'Progreso del procesamiento (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Resultado si está completado', required: false })
  result?: AnalysisResponseDto;

  @ApiProperty({ description: 'Error si falló', required: false })
  error?: string;
}