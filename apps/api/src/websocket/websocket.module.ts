import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LiveTranscriptionGateway } from './websocket.gateway';
import { TranscriptionModule } from '../transcription/transcription.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
    TranscriptionModule,
    AnalysisModule,
  ],
  providers: [LiveTranscriptionGateway],
  exports: [LiveTranscriptionGateway],
})
export class WebSocketModule {}
