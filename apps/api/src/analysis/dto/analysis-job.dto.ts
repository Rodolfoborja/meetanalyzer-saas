import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LlmProvider } from '@prisma/client';

export class AnalysisJobDto {
  @ApiProperty({ description: 'ID de la reunión a analizar' })
  @IsString()
  meetingId: string;

  @ApiProperty({ 
    description: 'Proveedor de LLM a usar',
    enum: LlmProvider,
    required: false
  })
  @IsOptional()
  @IsEnum(LlmProvider)
  llmProvider?: LlmProvider;

  @ApiProperty({ description: 'Modelo específico a usar', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Incluir métricas de oratoria', default: true })
  @IsOptional()
  @IsBoolean()
  includeOratoryMetrics?: boolean = true;

  @ApiProperty({ description: 'Incluir análisis de sentimientos', default: true })
  @IsOptional()
  @IsBoolean()
  includeSentimentAnalysis?: boolean = true;

  @ApiProperty({ description: 'Generar recomendaciones', default: true })
  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean = true;
}