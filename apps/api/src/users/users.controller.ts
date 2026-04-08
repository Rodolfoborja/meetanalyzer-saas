import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Listar usuarios de la organización' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios con paginación',
  })
  findAll(
    @Query() filterDto: FilterUsersDto,
    @CurrentUser() user: User,
  ) {
    return this.usersService.findAll(filterDto, user);
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios de la organización' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de usuarios',
  })
  getUserStats(@CurrentUser() user: User) {
    return this.usersService.getUserStats(user);
  }

  @Get('invitations')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Listar invitaciones pendientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de invitaciones pendientes',
  })
  getPendingInvitations(@CurrentUser() user: User) {
    return this.usersService.getPendingInvitations(user);
  }

  @Post('invite')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Invitar usuario por email' })
  @ApiResponse({
    status: 201,
    description: 'Invitación enviada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para invitar usuarios',
  })
  @ApiResponse({
    status: 400,
    description: 'Límite de usuarios alcanzado o rol inválido',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya pertenece a la organización',
  })
  inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() user: User,
  ) {
    return this.usersService.inviteUser(inviteUserDto, user);
  }

  @Delete('invitations/:id')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Cancelar invitación pendiente' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Invitación cancelada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitación no encontrada',
  })
  cancelInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.cancelInvitation(id, user);
  }

  @Get(':id')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Detalles del usuario',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Actualizar perfil de usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para actualizar este perfil',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: User,
  ) {
    return this.usersService.updateProfile(id, updateProfileDto, user);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Remover usuario de la organización' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Usuario removido exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el OWNER puede remover usuarios',
  })
  @ApiResponse({
    status: 400,
    description: 'No puedes removerte a ti mismo o a otro OWNER',
  })
  removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.removeUser(id, user);
  }
}