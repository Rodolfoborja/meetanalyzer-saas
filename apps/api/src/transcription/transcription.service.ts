import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AssemblyAI } from 'assemblyai';
import { PrismaService } from '../common/prisma/prisma.service';
import { TranscribeJobDto, TranscriptionLanguage } from './dto/transcribe-job.dto';
import { 
  TranscriptionResponseDto, 
  TranscriptionJobStatusDto,
  TranscriptSegment 
} from './dto/transcription-response.dto';
import { MeetingStatus, User } from '@prisma/client';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly assemblyAI: AssemblyAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue('transcription') private transcriptionQueue: Queue,
  ) {
    const apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY');
    if (!apiKey) {
      this.logger.error('AssemblyAI API key not found in configuration');
    }
    this.assemblyAI = new AssemblyAI({ apiKey: apiKey || '' });
  }

  async startTranscription(transcribeDto: TranscribeJobDto, user: User): Promise<{ jobId: string; message: string }> {
    const { meetingId, audioUrl, language, speakerLabels, keywordBoosting } = transcribeDto;

    // Verificar que la reunión existe y pertenece a la organización
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id: meetingId,
        organizationId: user.organizationId,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada');
    }

    // Verificar que la reunión tiene audio
    if (!meeting.audioUrl) {
      throw new NotFoundException('La reunión no tiene archivo de audio');
    }

    // Actualizar estado de la reunión
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.TRANSCRIBING },
    });

    // Agregar job a la cola
    const job = await this.transcriptionQueue.add(
      'transcribe-audio',
      {
        meetingId,
        audioUrl,
        language,
        speakerLabels,
        keywordBoosting,
        userId: user.id,
        organizationId: user.organizationId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    return {
      jobId: job.id.toString(),
      message: 'Transcripción iniciada. Recibirás una notificación cuando esté lista.',
    };
  }

  async processTranscription(jobData: any): Promise<TranscriptionResponseDto> {
    const { meetingId, audioUrl, language, speakerLabels, keywordBoosting } = jobData;

    try {
      this.logger.log(`Starting transcription for meeting ${meetingId}`);

      // Configurar parámetros de transcripción
      const transcriptConfig = {
        audio_url: audioUrl,
        language_code: language === TranscriptionLanguage.AUTO ? null : language,
        speaker_labels: speakerLabels,
        speakers_expected: speakerLabels ? 10 : null, // Máximo 10 speakers
        boost_param: keywordBoosting ? 'high' : 'default',
        format_text: true,
        punctuate: true,
        dual_channel: false,
      };

      // Iniciar transcripción en AssemblyAI
      const transcript = await this.assemblyAI.transcripts.create(transcriptConfig);
      
      // Esperar a que complete
      const completedTranscript = await this.assemblyAI.transcripts.waitUntilReady(transcript.id);

      if (completedTranscript.status === 'error') {
        throw new Error(completedTranscript.error || 'Error en la transcripción');
      }

      // Procesar resultado
      const segments: TranscriptSegment[] = [];
      let rawText = '';
      let totalConfidence = 0;
      let confidenceCount = 0;

      if (completedTranscript.utterances && speakerLabels) {
        // Con speaker labels
        for (const utterance of completedTranscript.utterances) {
          segments.push({
            timestamp: utterance.start,
            speaker: `Speaker ${utterance.speaker}`,
            text: utterance.text,
            confidence: utterance.confidence,
          });
          rawText += `Speaker ${utterance.speaker}: ${utterance.text}\n`;
          totalConfidence += utterance.confidence;
          confidenceCount++;
        }
      } else if (completedTranscript.words) {
        // Sin speaker labels, agrupar por frases
        let currentText = '';
        let currentStart = 0;
        let currentConfidences: number[] = [];

        for (let i = 0; i < completedTranscript.words.length; i++) {
          const word = completedTranscript.words[i];
          
          if (i === 0) {
            currentStart = word.start;
          }

          currentText += word.text + ' ';
          currentConfidences.push(word.confidence);

          // Dividir por puntuación o cada 20 palabras
          const shouldSplit = word.text.endsWith('.') || 
                             word.text.endsWith('?') || 
                             word.text.endsWith('!') ||
                             currentConfidences.length >= 20;

          if (shouldSplit || i === completedTranscript.words.length - 1) {
            const avgConfidence = currentConfidences.reduce((a, b) => a + b, 0) / currentConfidences.length;
            
            segments.push({
              timestamp: currentStart,
              speaker: 'Speaker 1',
              text: currentText.trim(),
              confidence: avgConfidence,
            });

            totalConfidence += avgConfidence;
            confidenceCount++;
            rawText += currentText.trim() + '\n';
            
            // Reset para siguiente segmento
            currentText = '';
            currentConfidences = [];
            if (i < completedTranscript.words.length - 1) {
              currentStart = completedTranscript.words[i + 1]?.start || word.end;
            }
          }
        }
      } else {
        // Fallback: usar texto completo
        segments.push({
          timestamp: 0,
          speaker: 'Speaker 1',
          text: completedTranscript.text || '',
          confidence: completedTranscript.confidence || 0,
        });
        rawText = completedTranscript.text || '';
        totalConfidence = completedTranscript.confidence || 0;
        confidenceCount = 1;
      }

      const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
      const wordCount = (completedTranscript.text || '').split(' ').filter(word => word.length > 0).length;

      // Guardar en base de datos
      const savedTranscript = await this.prisma.transcript.create({
        data: {
          meetingId,
          content: segments,
          rawText,
          wordCount,
          language: completedTranscript.language_code || 'es',
          confidence: averageConfidence,
          transcriptionId: completedTranscript.id,
        },
      });

      // Actualizar minutos usados en la reunión
      const audioDurationMinutes = Math.ceil((completedTranscript.audio_duration || 0) / 60);
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { 
          status: MeetingStatus.ANALYZING, // Listo para análisis
          minutesUsed: audioDurationMinutes,
        },
      });

      // Actualizar minutos usados en la organización
      await this.prisma.organization.update({
        where: { id: jobData.organizationId },
        data: {
          monthlyMinutesUsed: {
            increment: audioDurationMinutes,
          },
        },
      });

      this.logger.log(`Transcription completed for meeting ${meetingId}`);

      // TODO: Aquí se podría disparar el job de análisis automáticamente
      // Esto se implementará en el módulo de Analysis

      return {
        id: savedTranscript.id,
        meetingId: savedTranscript.meetingId,
        content: segments,
        rawText: savedTranscript.rawText,
        wordCount: savedTranscript.wordCount,
        language: savedTranscript.language,
        confidence: savedTranscript.confidence || 0,
        transcriptionId: savedTranscript.transcriptionId || '',
        createdAt: savedTranscript.createdAt,
        updatedAt: savedTranscript.updatedAt,
      };

    } catch (error) {
      this.logger.error(`Transcription failed for meeting ${meetingId}:`, error);
      
      // Actualizar estado de error en la reunión
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.ERROR },
      });

      throw new InternalServerErrorException('Error en la transcripción: ' + (error as Error).message);
    }
  }

  async getJobStatus(jobId: string, user: User): Promise<TranscriptionJobStatusDto> {
    const job = await this.transcriptionQueue.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException('Job de transcripción no encontrado');
    }

    // Verificar que el job pertenece a la organización del usuario
    if (job.data.organizationId !== user.organizationId) {
      throw new NotFoundException('Job de transcripción no encontrado');
    }

    const status = await job.getState();
    const progress = job.progress();

    const response: TranscriptionJobStatusDto = {
      jobId: job.id.toString(),
      meetingId: job.data.meetingId,
      status,
      progress: typeof progress === 'number' ? progress : 0,
    };

    if (status === 'completed' && job.returnvalue) {
      response.result = job.returnvalue;
    } else if (status === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    return response;
  }

  async getTranscript(meetingId: string, user: User): Promise<TranscriptionResponseDto | null> {
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id: meetingId,
        organizationId: user.organizationId,
      },
      include: {
        transcript: true,
      },
    });

    if (!meeting || !meeting.transcript) {
      return null;
    }

    const transcript = meeting.transcript;
    return {
      id: transcript.id,
      meetingId: transcript.meetingId,
      content: transcript.content as TranscriptSegment[],
      rawText: transcript.rawText,
      wordCount: transcript.wordCount,
      language: transcript.language,
      confidence: transcript.confidence || 0,
      transcriptionId: transcript.transcriptionId || '',
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    };
  }
}