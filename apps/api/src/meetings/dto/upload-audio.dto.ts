import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAudioDto {
  @ApiProperty({ description: 'URL del archivo de audio subido' })
  @IsString()
  audioUrl: string;

  @ApiProperty({ description: 'Formato del archivo (mp3, wav, etc.)', required: false })
  @IsOptional()
  @IsString()
  audioFormat?: string;

  @ApiProperty({ description: 'Duración del audio en segundos', required: false })
  @IsOptional()
  audioDuration?: number;
}