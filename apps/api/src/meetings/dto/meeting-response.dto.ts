import { ApiProperty } from '@nestjs/swagger';
import { MeetingStatus, MeetingPlatform } from '@prisma/client';

export class MeetingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiProperty({ required: false })
  meetingUrl?: string;

  @ApiProperty({ required: false })
  scheduledAt?: Date;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty({ enum: MeetingStatus })
  status: MeetingStatus;

  @ApiProperty({ required: false })
  audioUrl?: string;

  @ApiProperty({ required: false })
  audioFormat?: string;

  @ApiProperty({ required: false })
  audioDuration?: number;

  @ApiProperty()
  minutesUsed: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  transcript?: {
    id: string;
    content: any;
    rawText: string;
    wordCount: number;
    language: string;
    confidence?: number;
  };

  @ApiProperty({ required: false })
  analysis?: {
    id: string;
    summary: string;
    keyPoints: any;
    actionItems: any;
    decisions: any;
    followUps: any;
    oratoryMetrics?: any;
  };

  @ApiProperty({ required: false })
  participants?: Array<{
    id: string;
    speakerLabel: string;
    name?: string;
    email?: string;
    speakingTime: number;
    wordCount: number;
    turnCount: number;
    wordsPerMinute?: number;
    fillerWords?: any;
  }>;
}