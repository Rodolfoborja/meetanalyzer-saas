import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Nombre del usuario', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'URL del avatar', required: false })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiProperty({ description: 'API Key de OpenAI (personal)', required: false })
  @IsOptional()
  @IsString()
  openaiApiKey?: string;

  @ApiProperty({ description: 'API Key de Anthropic (personal)', required: false })
  @IsOptional()
  @IsString()
  anthropicApiKey?: string;

  @ApiProperty({ description: 'API Key de Gemini (personal)', required: false })
  @IsOptional()
  @IsString()
  geminiApiKey?: string;
}