import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExportsService } from './exports.service';
import { ExportsController, SharedMeetingController } from './exports.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [ConfigModule, PrismaModule, IntegrationsModule],
  controllers: [ExportsController, SharedMeetingController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
