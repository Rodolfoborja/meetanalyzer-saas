import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoachingService } from './coaching.service';
import { CoachingController } from './coaching.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [CoachingController],
  providers: [CoachingService],
  exports: [CoachingService],
})
export class CoachingModule {}
