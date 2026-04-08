import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoachingService } from './coaching.service';

@Controller('coaching')
@UseGuards(JwtAuthGuard)
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Get('report')
  async getReport(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.coachingService.generateReport(
      user.id,
      days ? parseInt(days) : 30,
    );
  }

  @Get('meetings/:meetingId/feedback')
  async getMeetingFeedback(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: any,
  ) {
    return this.coachingService.getMeetingFeedback(meetingId, user.id);
  }

  @Get('tips')
  async getTips(@CurrentUser() user: any) {
    return this.coachingService.getPersonalizedTips(user.id);
  }
}
