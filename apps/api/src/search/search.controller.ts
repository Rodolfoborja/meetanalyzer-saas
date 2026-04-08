import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('meetingIds') meetingIds?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('speakers') speakers?: string,
  ) {
    return this.searchService.search(user.organizationId, query, {
      limit: limit ? parseInt(limit) : 20,
      meetingIds: meetingIds?.split(','),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      speakers: speakers?.split(','),
    });
  }

  @Get('text')
  async textSearch(
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.textSearch(
      user.organizationId,
      query,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('trending')
  async getTrending(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.searchService.getTrendingTopics(
      user.organizationId,
      days ? parseInt(days) : 30,
    );
  }

  @Post('meetings/:meetingId/embeddings')
  async generateEmbeddings(
    @Param('meetingId') meetingId: string,
  ) {
    await this.searchService.generateEmbeddings(meetingId);
    return { success: true };
  }
}
