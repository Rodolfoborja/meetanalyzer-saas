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
import { AnalysisService } from './analysis.service';
import { AnalysisJobDto } from './dto/analysis-job.dto';
import { 
  AnalysisResponseDto, 
  AnalysisJobStatusDto 
} from './dto/analysis-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('start')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Iniciar análisis de una reunión' })
  @ApiResponse({
    status: 201,
    description: 'Análisis iniciado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Reunión no encontrada o sin transcripción',
  })
  @ApiResponse({
    status: 400,
    description: 'No se encontró API key para el proveedor LLM',
  })
  startAnalysis(
    @Body() analysisDto: AnalysisJobDto,
    @CurrentUser() user: User,
  ) {
    return this.analysisService.startAnalysis(analysisDto, user);
  }

  @Get('job/:jobId/status')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener estado de un job de análisis' })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Estado del job de análisis',
    type: AnalysisJobStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job no encontrado',
  })
  getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ): Promise<AnalysisJobStatusDto> {
    return this.analysisService.getJobStatus(jobId, user);
  }

  @Get('meeting/:meetingId')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener análisis de una reunión' })
  @ApiParam({ name: 'meetingId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Análisis de la reunión',
    type: AnalysisResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado',
  })
  async getAnalysis(
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @CurrentUser() user: User,
  ): Promise<AnalysisResponseDto | { message: string }> {
    const analysis = await this.analysisService.getAnalysis(meetingId, user);
    
    if (!analysis) {
      return { message: 'Análisis no encontrado o aún no disponible' };
    }
    
    return analysis;
  }
}