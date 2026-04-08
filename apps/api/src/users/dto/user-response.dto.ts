import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty({ required: false })
  googleId?: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Ocultar API keys sensibles
  @Exclude()
  openaiApiKey?: string;

  @Exclude()
  anthropicApiKey?: string;

  @Exclude()
  geminiApiKey?: string;
}