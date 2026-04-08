import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import { TranscriptionService } from './transcription.service';
import { TranscribeJobDto } from './dto/transcribe-job.dto';
import { 
  TranscriptionResponseDto, 
  TranscriptionJobStatusDto 
} from './dto/transcription-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('transcription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post('start')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Iniciar transcripción de una reunión' })
  @ApiResponse({
    status: 201,
    description: 'Transcripción iniciada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Reunión no encontrada o sin archivo de audio',
  })
  startTranscription(
    @Body() transcribeDto: TranscribeJobDto,
    @CurrentUser() user: User,
  ) {
    return this.transcriptionService.startTranscription(transcribeDto, user);
  }

  @Get('job/:jobId/status')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener estado de un job de transcripción' })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Estado del job de transcripción',
    type: TranscriptionJobStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job no encontrado',
  })
  getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ): Promise<TranscriptionJobStatusDto> {
    return this.transcriptionService.getJobStatus(jobId, user);
  }

  @Get('meeting/:meetingId')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener transcripción de una reunión' })
  @ApiParam({ name: 'meetingId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Transcripción de la reunión',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Transcripción no encontrada',
  })
  async getTranscript(
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @CurrentUser() user: User,
  ): Promise<TranscriptionResponseDto | { message: string }> {
    const transcript = await this.transcriptionService.getTranscript(meetingId, user);
    
    if (!transcript) {
      return { message: 'Transcripción no encontrada o aún no disponible' };
    }
    
    return transcript;
  }
}