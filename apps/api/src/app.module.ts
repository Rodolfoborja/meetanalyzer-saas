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
    
    // Features
    AuthModule,
    OrganizationsModule,
    UsersModule,
    MeetingsModule,
    TranscriptionModule,
    AnalysisModule,
    BillingModule,
    StorageModule,
    EmailModule,
  ],
})
export class AppModule {}
