import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // Webhooks CRUD
  // ============================================

  @Get('webhooks')
  @Roles('OWNER', 'ADMIN')
  async listWebhooks(@CurrentUser() user: any) {
    return this.prisma.webhook.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('webhooks')
  @Roles('OWNER', 'ADMIN')
  async createWebhook(
    @CurrentUser() user: any,
    @Body()
    body: {
      name: string;
      url: string;
      events: string[];
      secret?: string;
    },
  ) {
    return this.integrationsService.createWebhook(user.organizationId, body);
  }

  @Put('webhooks/:id')
  @Roles('OWNER', 'ADMIN')
  async updateWebhook(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { name?: string; url?: string; events?: string[]; enabled?: boolean },
  ) {
    return this.prisma.webhook.update({
      where: { id, organizationId: user.organizationId },
      data: body as any,
    });
  }

  @Delete('webhooks/:id')
  @Roles('OWNER', 'ADMIN')
  async deleteWebhook(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prisma.webhook.delete({
      where: { id, organizationId: user.organizationId },
    });
  }

  @Post('webhooks/:id/test')
  @Roles('OWNER', 'ADMIN')
  async testWebhook(@Param('id') id: string, @CurrentUser() user: any) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id, organizationId: user.organizationId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    await this.integrationsService.triggerWebhooks(
      user.organizationId,
      'TEST',
      { message: 'This is a test webhook from Romelly AI' },
    );

    return { success: true };
  }

  // ============================================
  // Slack
  // ============================================

  @Put('slack')
  @Roles('OWNER', 'ADMIN')
  async configureSlack(
    @CurrentUser() user: any,
    @Body() body: { webhookUrl: string },
  ) {
    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { slackWebhook: body.webhookUrl },
    });
  }

  @Post('slack/test')
  @Roles('OWNER', 'ADMIN')
  async testSlack(@CurrentUser() user: any) {
    await this.integrationsService.sendSlackNotification(user.organizationId, {
      title: '🧪 Test de Romelly AI',
      text: 'La integración con Slack está funcionando correctamente.',
      color: '#8B5CF6',
    });
    return { success: true };
  }

  // ============================================
  // Notion
  // ============================================

  @Put('notion')
  @Roles('OWNER', 'ADMIN')
  async configureNotion(
    @CurrentUser() user: any,
    @Body() body: { token: string; databaseId: string },
  ) {
    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        notionIntegration: {
          token: body.token,
          databaseId: body.databaseId,
        },
      },
    });
  }
}
