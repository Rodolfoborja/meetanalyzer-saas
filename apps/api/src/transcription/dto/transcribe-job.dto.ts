import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TranscriptionLanguage {
  ES = 'es',
  EN = 'en',
  AUTO = 'auto',
}

export class TranscribeJobDto {
  @ApiProperty({ description: 'ID de la reunión a transcribir' })
  @IsString()
  meetingId: string;

  @ApiProperty({ description: 'URL del archivo de audio' })
  @IsString()
  audioUrl: string;

  @ApiProperty({ 
    description: 'Idioma de la transcripción',
    enum: TranscriptionLanguage,
    default: TranscriptionLanguage.AUTO 
  })
  @IsOptional()
  @IsEnum(TranscriptionLanguage)
  language?: TranscriptionLanguage = TranscriptionLanguage.AUTO;

  @ApiProperty({ description: 'Habilitar identificación de speakers', default: true })
  @IsOptional()
  @IsBoolean()
  speakerLabels?: boolean = true;

  @ApiProperty({ description: 'Habilitar detección de palabras clave', default: true })
  @IsOptional()
  @IsBoolean()
  keywordBoosting?: boolean = true;
}