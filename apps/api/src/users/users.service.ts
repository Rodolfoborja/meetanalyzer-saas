import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { User, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filterDto: FilterUsersDto, user: User) {
    const { page, limit, role } = filterDto;
    
    const skip = (page - 1) * limit;
    
    const where: any = {
      organizationId: user.organizationId, // Multi-tenant filter
    };

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          googleId: true,
          role: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          // No incluir API keys sensibles
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: User) {
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId, // Multi-tenant filter
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        googleId: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        // Solo incluir API keys si es el propio usuario
        openaiApiKey: id === user.id,
        anthropicApiKey: id === user.id,
        geminiApiKey: id === user.id,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return targetUser;
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto, user: User) {
    // Solo puede actualizar su propio perfil o ser admin/owner
    if (id !== user.id && user.role !== Role.ADMIN && user.role !== Role.OWNER) {
      throw new ForbiddenException('No tienes permisos para actualizar este perfil');
    }

    const targetUser = await this.findOne(id, user);

    return this.prisma.user.update({
      where: { id },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        // Solo incluir API keys si es el propio usuario
        openaiApiKey: id === user.id,
        anthropicApiKey: id === user.id,
        geminiApiKey: id === user.id,
      },
    });
  }

  async inviteUser(inviteUserDto: InviteUserDto, user: User) {
    // Solo admins y owners pueden invitar
    if (user.role !== Role.ADMIN && user.role !== Role.OWNER) {
      throw new ForbiddenException('No tienes permisos para invitar usuarios');
    }

    const { email, role } = inviteUserDto;

    // No se puede asignar rol OWNER al invitar
    if (role === Role.OWNER) {
      throw new BadRequestException('No se puede asignar el rol OWNER al invitar un usuario');
    }

    // Solo OWNER puede asignar rol ADMIN
    if (role === Role.ADMIN && user.role !== Role.OWNER) {
      throw new ForbiddenException('Solo el OWNER puede asignar el rol ADMIN');
    }

    // Verificar límite de usuarios según el plan
    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { _count: { select: { users: true } } },
    });

    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }

    if (organization._count.users >= organization.maxUsers) {
      throw new BadRequestException(
        `Has alcanzado el límite de usuarios para tu plan (${organization.maxUsers})`
      );
    }

    // Verificar que el usuario no existe ya en la organización
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email,
        organizationId: user.organizationId,
      },
    });

    if (existingUser) {
      throw new ConflictException('El usuario ya pertenece a esta organización');
    }

    // Verificar si ya hay una invitación pendiente
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        organizationId: user.organizationId,
      },
    });

    if (existingInvitation) {
      // Actualizar invitación existente
      return this.prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          role,
          token: randomBytes(32).toString('hex'),
          expiresAt: addDays(new Date(), 7), // 7 días para aceptar
          invitedBy: user.id,
        },
      });
    }

    // Crear nueva invitación
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        role,
        token: randomBytes(32).toString('hex'),
        expiresAt: addDays(new Date(), 7), // 7 días para aceptar
        organizationId: user.organizationId,
        invitedBy: user.id,
      },
    });

    // TODO: Enviar email de invitación
    // Esto se implementará en el módulo de Email

    return {
      message: 'Invitación enviada exitosamente',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  async getPendingInvitations(user: User) {
    // Solo admins y owners pueden ver invitaciones pendientes
    if (user.role !== Role.ADMIN && user.role !== Role.OWNER) {
      throw new ForbiddenException('No tienes permisos para ver las invitaciones');
    }

    const invitations = await this.prisma.invitation.findMany({
      where: {
        organizationId: user.organizationId,
        expiresAt: { gt: new Date() }, // No expiradas
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations;
  }

  async cancelInvitation(invitationId: string, user: User) {
    // Solo admins y owners pueden cancelar invitaciones
    if (user.role !== Role.ADMIN && user.role !== Role.OWNER) {
      throw new ForbiddenException('No tienes permisos para cancelar invitaciones');
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: user.organizationId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invitación cancelada exitosamente' };
  }

  async removeUser(userId: string, user: User) {
    // Solo owners pueden remover usuarios (excepto a sí mismos)
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Solo el OWNER puede remover usuarios');
    }

    if (userId === user.id) {
      throw new BadRequestException('No puedes removerte a ti mismo');
    }

    const targetUser = await this.findOne(userId, user);

    if (targetUser.role === Role.OWNER) {
      throw new BadRequestException('No se puede remover a otro OWNER');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Usuario removido exitosamente' };
  }

  async getUserStats(user: User) {
    const stats = await this.prisma.user.groupBy({
      by: ['role'],
      where: { organizationId: user.organizationId },
      _count: true,
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { maxUsers: true },
    });

    return {
      usersByRole: stats.reduce(
        (acc, stat) => ({
          ...acc,
          [stat.role]: stat._count,
        }),
        {}
      ),
      totalUsers: stats.reduce((sum, stat) => sum + stat._count, 0),
      maxUsers: organization?.maxUsers || 0,
    };
  }
}