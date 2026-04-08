import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { TranscriptionService } from '../transcription/transcription.service';
import { AnalysisService } from '../analysis/analysis.service';
import * as fs from 'fs';
import * as path from 'path';

interface LiveSession {
  odingId: string;
  meetingId: string;
  userId: string;
  organizationId: string;
  audioChunks: Buffer[];
  startTime: Date;
  platform: string;
  meetingUrl: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  namespace: '/live',
})
export class LiveTranscriptionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveTranscriptionGateway.name);
  private sessions = new Map<string, LiveSession>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private transcriptionService: TranscriptionService,
    private analysisService: AnalysisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.organizationId = payload.organizationId;
      
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error('Auth failed', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up session if exists
    if (this.sessions.has(client.id)) {
      this.sessions.delete(client.id);
    }
  }

  @SubscribeMessage('start-recording')
  async handleStartRecording(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingUrl: string; platform: string; title: string },
  ) {
    this.logger.log(`Starting recording for ${client.id}`);

    // Create meeting in DB
    const meeting = await this.prisma.meeting.create({
      data: {
        title: data.title || `Reunión ${new Date().toLocaleDateString()}`,
        platform: this.mapPlatform(data.platform),
        meetingUrl: data.meetingUrl,
        userId: client.data.userId,
        organizationId: client.data.organizationId,
        status: 'TRANSCRIBING',
      },
    });

    // Create session
    this.sessions.set(client.id, {
      odingId: client.id,
      meetingId: meeting.id,
      userId: client.data.userId,
      organizationId: client.data.organizationId,
      audioChunks: [],
      startTime: new Date(),
      platform: data.platform,
      meetingUrl: data.meetingUrl,
    });

    client.emit('recording-started', { meetingId: meeting.id });
  }

  @SubscribeMessage('audio-chunk')
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chunk: string }, // base64 encoded audio
  ) {
    const session = this.sessions.get(client.id);
    if (!session) {
      client.emit('error', { message: 'No active session' });
      return;
    }

    // Store chunk
    const buffer = Buffer.from(data.chunk, 'base64');
    session.audioChunks.push(buffer);

    // Emit progress
    client.emit('chunk-received', { 
      chunks: session.audioChunks.length,
      duration: Math.round((Date.now() - session.startTime.getTime()) / 1000),
    });
  }

  @SubscribeMessage('stop-recording')
  async handleStopRecording(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) {
      client.emit('error', { message: 'No active session' });
      return;
    }

    this.logger.log(`Stopping recording for ${client.id}`);
    client.emit('processing-started', { meetingId: session.meetingId });

    try {
      // Combine audio chunks
      const fullAudio = Buffer.concat(session.audioChunks);
      
      // Save to temp file
      const tempDir = '/tmp/romelly';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempPath = path.join(tempDir, `${session.meetingId}.webm`);
      fs.writeFileSync(tempPath, fullAudio);

      // Get user's API key
      const user = await this.prisma.user.findUnique({
        where: { id: session.userId },
        select: { geminiApiKey: true },
      });

      const org = await this.prisma.organization.findUnique({
        where: { id: session.organizationId },
      });

      const apiKey = user?.geminiApiKey || process.env.GEMINI_API_KEY;

      // Transcribe
      client.emit('status', { step: 'transcribing', progress: 30 });
      
      const transcription = await this.transcriptionService.transcribe(
        tempPath,
        apiKey,
      );

      // Save transcript
      await this.prisma.transcript.create({
        data: {
          meetingId: session.meetingId,
          content: transcription.segments,
          rawText: transcription.rawText,
          wordCount: transcription.wordCount,
          language: transcription.language,
        },
      });

      // Create participants
      for (const speaker of transcription.speakers) {
        await this.prisma.participant.create({
          data: {
            meetingId: session.meetingId,
            speakerLabel: speaker,
            speakingTime: 0,
            wordCount: 0,
            turnCount: 0,
          },
        });
      }

      client.emit('transcription-complete', {
        segments: transcription.segments,
        speakers: transcription.speakers,
      });

      // Analyze
      client.emit('status', { step: 'analyzing', progress: 60 });
      
      const analysis = await this.analysisService.analyze(
        transcription.segments,
        transcription.rawText,
        apiKey,
      );

      // Save analysis
      await this.prisma.analysis.create({
        data: {
          meetingId: session.meetingId,
          llmProvider: 'GEMINI',
          model: 'gemini-1.5-pro',
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          actionItems: analysis.actionItems,
          decisions: analysis.decisions,
          followUps: analysis.followUps,
          oratoryMetrics: analysis.oratoryMetrics,
        },
      });

      // Update meeting status
      const duration = Math.round(
        (Date.now() - session.startTime.getTime()) / 1000 / 60,
      );
      
      await this.prisma.meeting.update({
        where: { id: session.meetingId },
        data: {
          status: 'COMPLETED',
          duration,
          audioDuration: transcription.duration,
        },
      });

      // Update org usage
      await this.prisma.organization.update({
        where: { id: session.organizationId },
        data: {
          monthlyMinutesUsed: { increment: duration },
        },
      });

      client.emit('status', { step: 'complete', progress: 100 });
      client.emit('analysis-complete', {
        meetingId: session.meetingId,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        actionItems: analysis.actionItems,
      });

      // Cleanup
      fs.unlinkSync(tempPath);
      this.sessions.delete(client.id);

    } catch (error) {
      this.logger.error('Processing failed', error);
      
      await this.prisma.meeting.update({
        where: { id: session.meetingId },
        data: { status: 'ERROR' },
      });

      client.emit('error', { message: error.message });
      this.sessions.delete(client.id);
    }
  }

  private mapPlatform(platform: string): any {
    const map: Record<string, string> = {
      'google-meet': 'GOOGLE_MEET',
      'teams': 'MICROSOFT_TEAMS',
      'zoom': 'ZOOM',
    };
    return map[platform] || 'UPLOAD';
  }
}
