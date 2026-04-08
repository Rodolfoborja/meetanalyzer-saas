import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActionItemsService } from './action-items.service';

@Controller('action-items')
@UseGuards(JwtAuthGuard)
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Get()
  async getActionItems(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('meetingId') meetingId?: string,
  ) {
    return this.actionItemsService.getActionItems(user.organizationId, {
      status: status?.split(','),
      priority: priority?.split(','),
      assigneeId,
      meetingId,
    });
  }

  @Get('mine')
  async getMyActionItems(@CurrentUser() user: any) {
    return this.actionItemsService.getMyActionItems(user.id);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.actionItemsService.getStats(user.organizationId);
  }

  @Get('upcoming')
  async getUpcoming(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.actionItemsService.getUpcomingDeadlines(
      user.organizationId,
      days ? parseInt(days) : 7,
    );
  }

  @Get('overdue')
  async getOverdue(@CurrentUser() user: any) {
    return this.actionItemsService.getOverdue(user.organizationId);
  }

  @Post('meetings/:meetingId')
  async createActionItem(
    @Param('meetingId') meetingId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      assigneeId?: string;
      assigneeName?: string;
      priority?: string;
      dueDate?: string;
      sourceTimestamp?: number;
      sourceText?: string;
    },
  ) {
    return this.actionItemsService.createActionItem(meetingId, {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
  }

  @Put(':id')
  async updateActionItem(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      assigneeId?: string;
      assigneeName?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
    },
  ) {
    return this.actionItemsService.updateActionItem(id, {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.actionItemsService.updateActionItem(id, {
      status: body.status,
    });
  }

  @Delete(':id')
  async deleteActionItem(@Param('id') id: string) {
    return this.actionItemsService.deleteActionItem(id);
  }

  @Post('bulk')
  async bulkUpdate(
    @Body()
    body: {
      ids: string[];
      status?: string;
      priority?: string;
      assigneeId?: string;
    },
  ) {
    return this.actionItemsService.bulkUpdate(body.ids, body);
  }
}
