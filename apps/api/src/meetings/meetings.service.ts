import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { FilterMeetingsDto } from './dto/filter-meetings.dto';
import { UploadAudioDto } from './dto/upload-audio.dto';
import { MeetingStatus, User } from '@prisma/client';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async create(createMeetingDto: CreateMeetingDto, user: User) {
    return this.prisma.meeting.create({
      data: {
        ...createMeetingDto,
        scheduledAt: createMeetingDto.scheduledAt
          ? new Date(createMeetingDto.scheduledAt)
          : null,
        userId: user.id,
        organizationId: user.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(filterDto: FilterMeetingsDto, user: User) {
    const { page, limit, status, platform, fromDate, toDate } = filterDto;
    
    const skip = (page - 1) * limit;
    
    const where: any = {
      organizationId: user.organizationId, // Multi-tenant filter
    };

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platform = platform;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const [meetings, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          transcript: {
            select: {
              id: true,
              wordCount: true,
              language: true,
              confidence: true,
            },
          },
          analysis: {
            select: {
              id: true,
              summary: true,
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return {
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: User) {
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id,
        organizationId: user.organizationId, // Multi-tenant filter
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transcript: true,
        analysis: true,
        participants: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada');
    }

    return meeting;
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto, user: User) {
    const meeting = await this.findOne(id, user);

    // Only owner of the meeting or admins can update
    if (meeting.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      throw new ForbiddenException('No tienes permisos para actualizar esta reunión');
    }

    return this.prisma.meeting.update({
      where: { id },
      data: {
        ...updateMeetingDto,
        scheduledAt: updateMeetingDto.scheduledAt
          ? new Date(updateMeetingDto.scheduledAt)
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, user: User) {
    const meeting = await this.findOne(id, user);

    // Only owner of the meeting or admins can delete
    if (meeting.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      throw new ForbiddenException('No tienes permisos para eliminar esta reunión');
    }

    // Check if meeting is being processed
    if (meeting.status === MeetingStatus.TRANSCRIBING || meeting.status === MeetingStatus.ANALYZING) {
      throw new BadRequestException('No se puede eliminar una reunión que se está procesando');
    }

    await this.prisma.meeting.delete({ where: { id } });
    return { message: 'Reunión eliminada correctamente' };
  }

  async uploadAudio(id: string, uploadAudioDto: UploadAudioDto, user: User) {
    const meeting = await this.findOne(id, user);

    // Only owner of the meeting can upload audio
    if (meeting.userId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede subir audio a esta reunión');
    }

    // Check if meeting is in correct state
    if (meeting.status !== MeetingStatus.PENDING) {
      throw new BadRequestException('La reunión debe estar en estado PENDING para subir audio');
    }

    return this.prisma.meeting.update({
      where: { id },
      data: {
        ...uploadAudioDto,
        status: MeetingStatus.UPLOADING,
      },
    });
  }

  async processMeeting(id: string, user: User) {
    const meeting = await this.findOne(id, user);

    // Only owner of the meeting or admins can process
    if (meeting.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      throw new ForbiddenException('No tienes permisos para procesar esta reunión');
    }

    // Check if meeting has audio
    if (!meeting.audioUrl) {
      throw new BadRequestException('La reunión debe tener audio para ser procesada');
    }

    // Check if already processed or in process
    if (
      meeting.status === MeetingStatus.TRANSCRIBING ||
      meeting.status === MeetingStatus.ANALYZING ||
      meeting.status === MeetingStatus.COMPLETED
    ) {
      throw new BadRequestException('La reunión ya está siendo procesada o completada');
    }

    // Update status to transcribing
    const updatedMeeting = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.TRANSCRIBING },
    });

    return {
      message: 'Procesamiento de reunión iniciado. Se iniciará la transcripción automáticamente.',
      meeting: updatedMeeting,
      nextStep: 'La transcripción se procesará automáticamente y luego se iniciará el análisis.',
    };
  }

  async getStats(user: User) {
    const where = { organizationId: user.organizationId };

    const [
      totalMeetings,
      completedMeetings,
      pendingMeetings,
      totalMinutesUsed,
    ] = await Promise.all([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.count({ where: { ...where, status: MeetingStatus.COMPLETED } }),
      this.prisma.meeting.count({ where: { ...where, status: MeetingStatus.PENDING } }),
      this.prisma.meeting.aggregate({
        where,
        _sum: { minutesUsed: true },
      }),
    ]);

    return {
      totalMeetings,
      completedMeetings,
      pendingMeetings,
      totalMinutesUsed: totalMinutesUsed._sum.minutesUsed || 0,
    };
  }
}