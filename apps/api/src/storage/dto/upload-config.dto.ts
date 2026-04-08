import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FileType {
  AUDIO = 'audio',
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export class GetUploadUrlDto {
  @ApiProperty({ description: 'Nombre del archivo' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'Tipo MIME del archivo' })
  @IsString()
  contentType: string;

  @ApiProperty({ 
    description: 'Tipo de archivo',
    enum: FileType 
  })
  @IsEnum(FileType)
  fileType: FileType;

  @ApiProperty({ description: 'Tamaño del archivo en bytes', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB máximo
  fileSize?: number;
}