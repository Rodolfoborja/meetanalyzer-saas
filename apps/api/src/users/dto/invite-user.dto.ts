import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @ApiProperty({ description: 'Email del usuario a invitar' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Rol a asignar al usuario invitado',
    enum: Role,
    default: Role.MEMBER 
  })
  @IsEnum(Role)
  role: Role = Role.MEMBER;
}