import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class FilterUsersDto {
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
    description: 'Filtrar por rol',
    enum: Role,
    required: false 
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}