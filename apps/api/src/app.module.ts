import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { AnalysisModule } from './analysis/analysis.module';
import { BillingModule } from './billing/billing.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { WebSocketModule } from './websocket/websocket.module';

// 🆕 New innovative modules
import { AiChatModule } from './ai-chat/ai-chat.module';
import { SearchModule } from './search/search.module';
import { CoachingModule } from './coaching/coaching.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ExportsModule } from './exports/exports.module';
import { TemplatesModule } from './templates/templates.module';
import { ActionItemsModule } from './action-items/action-items.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Queue
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Core
    PrismaModule,
    
    // Auth & Users
    AuthModule,
    OrganizationsModule,
    UsersModule,
    
    // Meeting Core
    MeetingsModule,
    TranscriptionModule,
    AnalysisModule,
    
    // Infrastructure
    BillingModule,
    StorageModule,
    EmailModule,
    WebSocketModule,
    
    // 🆕 Innovation Features
    AiChatModule,        // Chat with your meetings
    SearchModule,        // Semantic search across all meetings
    CoachingModule,      // Personal oratory coaching
    IntegrationsModule,  // Slack, Notion, Linear, Webhooks
    ExportsModule,       // Export to MD, PDF, Notion, Linear
    TemplatesModule,     // Meeting templates (1:1, standup, etc.)
    ActionItemsModule,   // Action item tracking with status
  ],
})
export class AppModule {}
