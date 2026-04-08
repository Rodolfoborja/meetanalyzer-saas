import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { FilterMeetingsDto } from './dto/filter-meetings.dto';
import { UploadAudioDto } from './dto/upload-audio.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Crear nueva reunión' })
  @ApiResponse({
    status: 201,
    description: 'Reunión creada exitosamente',
    type: MeetingResponseDto,
  })
  create(
    @Body() createMeetingDto: CreateMeetingDto,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.create(createMeetingDto, user);
  }

  @Get()
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Listar reuniones con filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reuniones con paginación',
  })
  findAll(
    @Query() filterDto: FilterMeetingsDto,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.findAll(filterDto, user);
  }

  @Get('stats')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener estadísticas de reuniones de la organización' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de reuniones',
  })
  getStats(@CurrentUser() user: User) {
    return this.meetingsService.getStats(user);
  }

  @Get(':id')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener reunión por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la reunión',
    type: MeetingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reunión no encontrada',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Actualizar reunión' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Reunión actualizada exitosamente',
    type: MeetingResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para actualizar esta reunión',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.update(id, updateMeetingDto, user);
  }

  @Delete(':id')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Eliminar reunión' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Reunión eliminada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para eliminar esta reunión',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.remove(id, user);
  }

  @Post(':id/upload-audio')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Subir audio a una reunión' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Audio subido exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para subir audio a esta reunión',
  })
  uploadAudio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() uploadAudioDto: UploadAudioDto,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.uploadAudio(id, uploadAudioDto, user);
  }

  @Post(':id/process')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Iniciar procesamiento de reunión (transcripción y análisis)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Procesamiento iniciado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'La reunión no tiene audio o ya está siendo procesada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para procesar esta reunión',
  })
  process(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.meetingsService.processMeeting(id, user);
  }
}