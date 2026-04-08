import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TranscriptionService } from './transcription.service';
import { TranscriptionResponseDto } from './dto/transcription-response.dto';

@Processor('transcription')
export class TranscriptionProcessor {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(private transcriptionService: TranscriptionService) {}

  @Process('transcribe-audio')
  async handleTranscription(job: Job): Promise<TranscriptionResponseDto> {
    this.logger.log(`Processing transcription job ${job.id} for meeting ${job.data.meetingId}`);
    
    try {
      // Actualizar progreso
      await job.progress(10);
      
      const result = await this.transcriptionService.processTranscription(job.data);
      
      // Completar progreso
      await job.progress(100);
      
      this.logger.log(`Transcription job ${job.id} completed successfully`);
      return result;
      
    } catch (error) {
      this.logger.error(`Transcription job ${job.id} failed:`, error);
      throw error;
    }
  }
}