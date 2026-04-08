import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';

@Controller('meetings/:meetingId/chat')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async chat(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: any,
    @Body() body: { question: string; sessionId?: string },
  ) {
    return this.aiChatService.chat(
      meetingId,
      user.id,
      body.question,
      body.sessionId,
    );
  }

  @Get('suggestions')
  async getSuggestions(@Param('meetingId') meetingId: string) {
    return this.aiChatService.getSuggestedQuestions(meetingId);
  }

  @Get('history/:sessionId')
  async getHistory(@Param('sessionId') sessionId: string) {
    return this.aiChatService.getHistory(sessionId);
  }
}
