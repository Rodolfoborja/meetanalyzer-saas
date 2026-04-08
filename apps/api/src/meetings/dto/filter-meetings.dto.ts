import { IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MeetingStatus, MeetingPlatform } from '@prisma/client';

export class FilterMeetingsDto {
  @ApiProperty({ description: 'Página (pagination)', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Elementos por página', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ 
    description: 'Filtrar por estado',
    enum: MeetingStatus,
    required: false 
  })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @ApiProperty({ 
    description: 'Filtrar por plataforma',
    enum: MeetingPlatform,
    required: false 
  })
  @IsOptional()
  @IsEnum(MeetingPlatform)
  platform?: MeetingPlatform;

  @ApiProperty({ description: 'Fecha desde (ISO string)', required: false })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ description: 'Fecha hasta (ISO string)', required: false })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}