import { ApiProperty } from '@nestjs/swagger';

export interface TranscriptSegment {
  timestamp: number;
  speaker: string;
  text: string;
  confidence: number;
}

export class TranscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  meetingId: string;

  @ApiProperty({ description: 'Contenido estructurado de la transcripción' })
  content: TranscriptSegment[];

  @ApiProperty({ description: 'Texto completo sin formato' })
  rawText: string;

  @ApiProperty({ description: 'Número de palabras' })
  wordCount: number;

  @ApiProperty({ description: 'Idioma detectado' })
  language: string;

  @ApiProperty({ description: 'Confianza promedio de la transcripción' })
  confidence: number;

  @ApiProperty({ description: 'ID de la transcripción en AssemblyAI' })
  transcriptionId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TranscriptionJobStatusDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  meetingId: string;

  @ApiProperty({ description: 'Estado del job (waiting, active, completed, failed)' })
  status: string;

  @ApiProperty({ description: 'Progreso del procesamiento (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Resultado si está completado', required: false })
  result?: TranscriptionResponseDto;

  @ApiProperty({ description: 'Error si falló', required: false })
  error?: string;
}