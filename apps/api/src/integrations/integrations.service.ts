import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  organizationId: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // ============================================
  // Webhooks
  // ============================================

  async createWebhook(
    organizationId: string,
    data: {
      name: string;
      url: string;
      events: string[];
      secret?: string;
    },
  ) {
    return this.prisma.webhook.create({
      data: {
        organizationId,
        name: data.name,
        url: data.url,
        events: data.events as any,
        secret: data.secret || this.generateSecret(),
        enabled: true,
      },
    });
  }

  async triggerWebhooks(
    organizationId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        organizationId,
        enabled: true,
        events: { has: event as any },
      },
    });

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    for (const webhook of webhooks) {
      this.sendWebhook(webhook, payload).catch((error) => {
        this.logger.error(`Webhook ${webhook.id} failed`, error);
      });
    }
  }

  private async sendWebhook(
    webhook: any,
    payload: WebhookPayload,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = webhook.secret
      ? this.generateSignature(body, webhook.secret)
      : undefined;

    try {
      const axios = (await import('axios')).default;
      await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'X-Romelly-Signature': signature }),
        },
        timeout: 10000,
      });

      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date(),
          failureCount: 0,
        },
      });
    } catch (error) {
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: { increment: 1 },
        },
      });
      throw error;
    }
  }

  // ============================================
  // Slack Integration
  // ============================================

  async sendSlackNotification(
    organizationId: string,
    message: {
      title: string;
      text: string;
      fields?: Array<{ title: string; value: string; short?: boolean }>;
      color?: string;
      url?: string;
    },
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.slackWebhook) {
      this.logger.warn(`No Slack webhook for org ${organizationId}`);
      return;
    }

    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: message.title, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message.text },
      },
    ];

    if (message.fields?.length) {
      blocks.push({
        type: 'section',
        fields: message.fields.map((f) => ({
          type: 'mrkdwn',
          text: `*${f.title}*\n${f.value}`,
        })),
      });
    }

    if (message.url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Ver en Romelly AI' },
            url: message.url,
            style: 'primary',
          },
        ],
      });
    }

    try {
      const axios = (await import('axios')).default;
      await axios.post(org.slackWebhook, {
        attachments: [
          {
            color: message.color || '#8B5CF6',
            blocks,
          },
        ],
      });
    } catch (error) {
      this.logger.error('Slack notification failed', error);
    }
  }

  // ============================================
  // Linear Integration
  // ============================================

  async createLinearIssue(
    linearApiKey: string,
    data: {
      teamId: string;
      title: string;
      description?: string;
      priority?: number;
      assigneeId?: string;
    },
  ): Promise<{ id: string; identifier: string; url: string }> {
    const axios = (await import('axios')).default;
    
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            url
          }
        }
      }
    `;

    const response = await axios.post(
      'https://api.linear.app/graphql',
      {
        query: mutation,
        variables: {
          input: {
            teamId: data.teamId,
            title: data.title,
            description: data.description,
            priority: data.priority || 2,
            assigneeId: data.assigneeId,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: linearApiKey,
        },
      },
    );

    const issue = response.data.data.issueCreate.issue;
    return {
      id: issue.id,
      identifier: issue.identifier,
      url: issue.url,
    };
  }

  // ============================================
  // Notion Integration
  // ============================================

  async createNotionPage(
    notionToken: string,
    databaseId: string,
    data: {
      title: string;
      content: string;
      properties?: Record<string, any>;
    },
  ): Promise<{ id: string; url: string }> {
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
      'https://api.notion.com/v1/pages',
      {
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: data.title } }],
          },
          ...data.properties,
        },
        children: this.markdownToNotionBlocks(data.content),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
        },
      },
    );

    return {
      id: response.data.id,
      url: response.data.url,
    };
  }

  // ============================================
  // Calendar Integration (Google Calendar)
  // ============================================

  async createCalendarEvent(
    accessToken: string,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      attendees?: string[];
    },
  ): Promise<{ id: string; htmlLink: string }> {
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'America/Guayaquil',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'America/Guayaquil',
        },
        attendees: event.attendees?.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          conferenceDataVersion: 1,
        },
      },
    );

    return {
      id: response.data.id,
      htmlLink: response.data.htmlLink,
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private markdownToNotionBlocks(markdown: string): any[] {
    // Simplified markdown to Notion blocks conversion
    const lines = markdown.split('\n');
    const blocks: any[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: line.slice(2) } }],
          },
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.slice(3) } }],
          },
        });
      } else if (line.startsWith('- ')) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: line.slice(2) } }],
          },
        });
      } else if (line.trim()) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }],
          },
        });
      }
    }

    return blocks;
  }
}
