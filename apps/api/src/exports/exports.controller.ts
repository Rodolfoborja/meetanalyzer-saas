import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportsService, ExportOptions } from './exports.service';

@Controller('meetings/:meetingId/export')
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('markdown')
  async exportMarkdown(
    @Param('meetingId') meetingId: string,
    @Query('includeTranscript') includeTranscript?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('includeActionItems') includeActionItems?: string,
    @Res() res: Response,
  ) {
    const options: ExportOptions = {
      includeTranscript: includeTranscript !== 'false',
      includeSummary: includeSummary !== 'false',
      includeActionItems: includeActionItems !== 'false',
    };

    const markdown = await this.exportsService.exportToMarkdown(meetingId, options);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="meeting-${meetingId}.md"`);
    res.send(markdown);
  }

  @Get('json')
  async exportJson(@Param('meetingId') meetingId: string) {
    return this.exportsService.exportToJson(meetingId);
  }

  @Post('notion')
  async exportToNotion(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: any,
    @Body() options: ExportOptions,
  ) {
    return this.exportsService.exportToNotion(
      meetingId,
      user.organizationId,
      options,
    );
  }

  @Post('linear')
  async exportToLinear(
    @Param('meetingId') meetingId: string,
    @Body() body: { apiKey: string; teamId: string },
  ) {
    return this.exportsService.exportToLinear(
      meetingId,
      body.apiKey,
      body.teamId,
    );
  }

  @Post('share')
  async generateShareLink(@Param('meetingId') meetingId: string) {
    const url = await this.exportsService.generateShareLink(meetingId);
    return { url };
  }
}

@Controller('shared')
export class SharedMeetingController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get(':shareToken')
  async getSharedMeeting(@Param('shareToken') shareToken: string) {
    return this.exportsService.getSharedMeeting(shareToken);
  }
}
