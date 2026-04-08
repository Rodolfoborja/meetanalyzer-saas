import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { GetUploadUrlDto, FileType } from './dto/upload-config.dto';
import { UploadUrlResponseDto, DownloadUrlResponseDto } from './dto/upload-response.dto';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private cdnUrl?: string;

  private readonly ALLOWED_MIME_TYPES = {
    [FileType.AUDIO]: [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/m4a',
      'audio/webm',
      'audio/ogg',
    ],
    [FileType.IMAGE]: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    [FileType.DOCUMENT]: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };

  private readonly MAX_FILE_SIZES = {
    [FileType.AUDIO]: 100 * 1024 * 1024, // 100MB
    [FileType.IMAGE]: 10 * 1024 * 1024,  // 10MB
    [FileType.DOCUMENT]: 50 * 1024 * 1024, // 50MB
  };

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || 'meetanalyzer-storage';
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.cdnUrl = this.configService.get<string>('AWS_CDN_URL');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
      endpoint: this.configService.get<string>('AWS_ENDPOINT'), // Para MinIO local
      forcePathStyle: !!this.configService.get<string>('AWS_ENDPOINT'), // Para MinIO
    });
  }

  async getUploadUrl(
    uploadDto: GetUploadUrlDto,
    user: User,
  ): Promise<UploadUrlResponseDto> {
    const { fileName, contentType, fileType, fileSize } = uploadDto;

    // Validar tipo MIME
    if (!this.ALLOWED_MIME_TYPES[fileType].includes(contentType)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Tipos permitidos para ${fileType}: ${this.ALLOWED_MIME_TYPES[fileType].join(', ')}`
      );
    }

    // Validar tamaño de archivo
    if (fileSize && fileSize > this.MAX_FILE_SIZES[fileType]) {
      throw new BadRequestException(
        `Archivo demasiado grande. Tamaño máximo para ${fileType}: ${this.MAX_FILE_SIZES[fileType] / 1024 / 1024}MB`
      );
    }

    // Generar key único para el archivo
    const fileExtension = this.getFileExtension(fileName);
    const uniqueId = randomUUID();
    const timestamp = Date.now();
    const fileKey = `${user.organizationId}/${fileType}/${timestamp}-${uniqueId}.${fileExtension}`;

    try {
      // Crear comando para subir archivo
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: contentType,
        Metadata: {
          userId: user.id,
          organizationId: user.organizationId,
          originalName: fileName,
          fileType,
        },
      });

      // Generar URL firmada para subida (válida por 15 minutos)
      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: 15 * 60, // 15 minutos
      });

      // Generar URL pública para acceso
      const fileUrl = this.cdnUrl
        ? `${this.cdnUrl}/${fileKey}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileKey}`;

      return {
        uploadUrl,
        fileUrl,
        fileKey,
        expiresIn: 15,
        headers: {
          'Content-Type': contentType,
        },
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw new InternalServerErrorException('Error al generar URL de subida');
    }
  }

  async getDownloadUrl(
    fileKey: string,
    user: User,
  ): Promise<DownloadUrlResponseDto> {
    // Verificar que el archivo pertenece a la organización del usuario
    if (!fileKey.startsWith(`${user.organizationId}/`)) {
      throw new BadRequestException('No tienes permisos para acceder a este archivo');
    }

    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      // Generar URL firmada para descarga (válida por 1 hora)
      const downloadUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: 60 * 60, // 1 hora
      });

      return {
        downloadUrl,
        expiresIn: 60,
      };
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new InternalServerErrorException('Error al generar URL de descarga');
    }
  }

  async deleteFile(fileKey: string, user: User): Promise<void> {
    // Verificar que el archivo pertenece a la organización del usuario
    if (!fileKey.startsWith(`${user.organizationId}/`)) {
      throw new BadRequestException('No tienes permisos para eliminar este archivo');
    }

    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(deleteCommand);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new InternalServerErrorException('Error al eliminar archivo');
    }
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'unknown';
  }

  // Método auxiliar para validar archivos directamente subidos
  validateFile(file: Express.Multer.File, fileType: FileType): void {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    // Validar tipo MIME
    if (!this.ALLOWED_MIME_TYPES[fileType].includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Tipos permitidos: ${this.ALLOWED_MIME_TYPES[fileType].join(', ')}`
      );
    }

    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZES[fileType]) {
      throw new BadRequestException(
        `Archivo demasiado grande. Tamaño máximo: ${this.MAX_FILE_SIZES[fileType] / 1024 / 1024}MB`
      );
    }
  }

  // Método auxiliar para subir archivos directamente
  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
    user: User,
  ): Promise<string> {
    this.validateFile(file, fileType);

    const fileExtension = this.getFileExtension(file.originalname);
    const uniqueId = randomUUID();
    const timestamp = Date.now();
    const fileKey = `${user.organizationId}/${fileType}/${timestamp}-${uniqueId}.${fileExtension}`;

    try {
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          userId: user.id,
          organizationId: user.organizationId,
          originalName: file.originalname,
          fileType,
        },
      });

      await this.s3Client.send(putCommand);

      // Retornar URL pública
      return this.cdnUrl
        ? `${this.cdnUrl}/${fileKey}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileKey}`;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new InternalServerErrorException('Error al subir archivo');
    }
  }
}