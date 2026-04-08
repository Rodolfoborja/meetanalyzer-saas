import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'URL firmada para subir el archivo' })
  uploadUrl: string;

  @ApiProperty({ description: 'URL pública del archivo después de la subida' })
  fileUrl: string;

  @ApiProperty({ description: 'Key único del archivo en S3' })
  fileKey: string;

  @ApiProperty({ description: 'Tiempo de expiración de la URL firmada (en minutos)' })
  expiresIn: number;

  @ApiProperty({ description: 'Headers requeridos para la subida' })
  headers: Record<string, string>;
}

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'URL firmada para descargar el archivo' })
  downloadUrl: string;

  @ApiProperty({ description: 'Tiempo de expiración de la URL firmada (en minutos)' })
  expiresIn: number;
}