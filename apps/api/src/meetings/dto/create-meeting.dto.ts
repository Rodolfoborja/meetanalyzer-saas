import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MeetingPlatform } from '@prisma/client';

export class CreateMeetingDto {
  @ApiProperty({ description: 'Título de la reunión' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Descripción opcional', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ 
    description: 'Plataforma de la reunión',
    enum: MeetingPlatform,
    default: MeetingPlatform.UPLOAD 
  })
  @IsEnum(MeetingPlatform)
  @IsOptional()
  platform?: MeetingPlatform = MeetingPlatform.UPLOAD;

  @ApiProperty({ description: 'URL de la reunión', required: false })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiProperty({ description: 'Fecha programada (ISO string)', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Duración estimada en minutos', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}