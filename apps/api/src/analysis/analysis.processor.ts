import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AnalysisService } from './analysis.service';
import { AnalysisResponseDto } from './dto/analysis-response.dto';

@Processor('analysis')
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(private analysisService: AnalysisService) {}

  @Process('analyze-transcript')
  async handleAnalysis(job: Job): Promise<AnalysisResponseDto> {
    this.logger.log(`Processing analysis job ${job.id} for meeting ${job.data.meetingId}`);
    
    try {
      // Actualizar progreso
      await job.progress(10);
      
      const result = await this.analysisService.processAnalysis(job.data);
      
      // Completar progreso
      await job.progress(100);
      
      this.logger.log(`Analysis job ${job.id} completed successfully`);
      return result;
      
    } catch (error) {
      this.logger.error(`Analysis job ${job.id} failed:`, error);
      throw error;
    }
  }
}