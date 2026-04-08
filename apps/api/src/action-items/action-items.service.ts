import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

export interface ActionItemFilters {
  status?: string[];
  priority?: string[];
  assigneeId?: string;
  meetingId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

@Injectable()
export class ActionItemsService {
  private readonly logger = new Logger(ActionItemsService.name);

  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService,
  ) {}

  /**
   * Get all action items for an organization with filters
   */
  async getActionItems(
    organizationId: string,
    filters: ActionItemFilters = {},
  ): Promise<any[]> {
    const where: any = {
      meeting: { organizationId },
    };

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.meetingId) {
      where.meetingId = filters.meetingId;
    }
    if (filters.dueBefore) {
      where.dueDate = { ...where.dueDate, lte: filters.dueBefore };
    }
    if (filters.dueAfter) {
      where.dueDate = { ...where.dueDate, gte: filters.dueAfter };
    }

    return this.prisma.actionItem.findMany({
      where,
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  /**
   * Get action items assigned to a user
   */
  async getMyActionItems(userId: string): Promise<any[]> {
    return this.prisma.actionItem.findMany({
      where: {
        assigneeId: userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        meeting: { select: { id: true, title: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  /**
   * Create a new action item
   */
  async createActionItem(
    meetingId: string,
    data: {
      title: string;
      description?: string;
      assigneeId?: string;
      assigneeName?: string;
      priority?: string;
      dueDate?: Date;
      sourceTimestamp?: number;
      sourceText?: string;
    },
  ) {
    return this.prisma.actionItem.create({
      data: {
        meetingId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        assigneeName: data.assigneeName,
        priority: (data.priority as any) || 'MEDIUM',
        dueDate: data.dueDate,
        sourceTimestamp: data.sourceTimestamp,
        sourceText: data.sourceText,
        status: 'PENDING',
      },
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Update an action item
   */
  async updateActionItem(
    actionItemId: string,
    data: {
      title?: string;
      description?: string;
      assigneeId?: string;
      assigneeName?: string;
      status?: string;
      priority?: string;
      dueDate?: Date;
    },
  ) {
    const item = await this.prisma.actionItem.findUnique({
      where: { id: actionItemId },
      include: { meeting: { select: { organizationId: true } } },
    });

    if (!item) throw new NotFoundException('Action item not found');

    const updated = await this.prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        ...data,
        status: data.status as any,
        priority: data.priority as any,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Trigger webhook if status changed to completed
    if (data.status === 'COMPLETED') {
      this.integrations
        .triggerWebhooks(item.meeting.organizationId, 'ACTION_ITEM_COMPLETED', {
          actionItem: updated,
        })
        .catch((e) => this.logger.error('Webhook failed', e));
    }

    return updated;
  }

  /**
   * Delete an action item
   */
  async deleteActionItem(actionItemId: string) {
    return this.prisma.actionItem.delete({
      where: { id: actionItemId },
    });
  }

  /**
   * Bulk update action items
   */
  async bulkUpdate(
    actionItemIds: string[],
    data: { status?: string; priority?: string; assigneeId?: string },
  ) {
    return this.prisma.actionItem.updateMany({
      where: { id: { in: actionItemIds } },
      data: {
        status: data.status as any,
        priority: data.priority as any,
        assigneeId: data.assigneeId,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Get action item statistics
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byPriority: Record<string, number>;
    byAssignee: Array<{ assignee: string; count: number }>;
  }> {
    const items = await this.prisma.actionItem.findMany({
      where: {
        meeting: { organizationId },
        status: { not: 'CANCELLED' },
      },
      include: {
        assignee: { select: { name: true } },
      },
    });

    const now = new Date();
    const stats = {
      total: items.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      byPriority: {} as Record<string, number>,
      byAssignee: [] as Array<{ assignee: string; count: number }>,
    };

    const assigneeCounts = new Map<string, number>();

    for (const item of items) {
      // Status counts
      if (item.status === 'PENDING') stats.pending++;
      else if (item.status === 'IN_PROGRESS') stats.inProgress++;
      else if (item.status === 'COMPLETED') stats.completed++;

      // Overdue check
      if (
        item.dueDate &&
        item.dueDate < now &&
        item.status !== 'COMPLETED'
      ) {
        stats.overdue++;
      }

      // Priority counts
      stats.byPriority[item.priority] =
        (stats.byPriority[item.priority] || 0) + 1;

      // Assignee counts
      const assigneeName =
        item.assignee?.name || item.assigneeName || 'Unassigned';
      assigneeCounts.set(
        assigneeName,
        (assigneeCounts.get(assigneeName) || 0) + 1,
      );
    }

    stats.byAssignee = Array.from(assigneeCounts.entries())
      .map(([assignee, count]) => ({ assignee, count }))
      .sort((a, b) => b.count - a.count);

    return stats;
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(
    organizationId: string,
    days = 7,
  ): Promise<any[]> {
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.actionItem.findMany({
      where: {
        meeting: { organizationId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: {
          gte: new Date(),
          lte: future,
        },
      },
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get overdue items
   */
  async getOverdue(organizationId: string): Promise<any[]> {
    return this.prisma.actionItem.findMany({
      where: {
        meeting: { organizationId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
      },
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
