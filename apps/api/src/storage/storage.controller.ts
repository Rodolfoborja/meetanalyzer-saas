import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { GetUploadUrlDto, FileType } from './dto/upload-config.dto';
import { UploadUrlResponseDto, DownloadUrlResponseDto } from './dto/upload-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener URL firmada para subir archivo' })
  @ApiResponse({
    status: 201,
    description: 'URL firmada generada exitosamente',
    type: UploadUrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tipo de archivo no permitido o archivo demasiado grande',
  })
  getUploadUrl(
    @Body() uploadDto: GetUploadUrlDto,
    @CurrentUser() user: User,
  ): Promise<UploadUrlResponseDto> {
    return this.storageService.getUploadUrl(uploadDto, user);
  }

  @Get('download-url/:fileKey')
  @Roles(Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Obtener URL firmada para descargar archivo' })
  @ApiParam({ name: 'fileKey', type: 'string', description: 'Key del archivo en S3' })
  @ApiResponse({
    status: 200,
    description: 'URL firmada de descarga generada exitosamente',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No tienes permisos para acceder a este archivo',
  })
  getDownloadUrl(
    @Param('fileKey') fileKey: string,
    @CurrentUser() user: User,
  ): Promise<DownloadUrlResponseDto> {
    // Decodificar el fileKey que puede venir como parámetro URL encoded
    const decodedFileKey = decodeURIComponent(fileKey);
    return this.storageService.getDownloadUrl(decodedFileKey, user);
  }

  @Delete(':fileKey')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiParam({ name: 'fileKey', type: 'string', description: 'Key del archivo en S3' })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No tienes permisos para eliminar este archivo',
  })
  async deleteFile(
    @Param('fileKey') fileKey: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    const decodedFileKey = decodeURIComponent(fileKey);
    await this.storageService.deleteFile(decodedFileKey, user);
    return { message: 'Archivo eliminado exitosamente' };
  }

  // Endpoints para subida directa (alternativa a URL firmadas)
  @Post('upload/audio')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir archivo de audio directamente' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Archivo de audio subido exitosamente',
  })
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ fileUrl: string; message: string }> {
    const fileUrl = await this.storageService.uploadFile(file, FileType.AUDIO, user);
    return {
      fileUrl,
      message: 'Archivo de audio subido exitosamente',
    };
  }

  @Post('upload/image')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir imagen directamente' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Imagen subida exitosamente',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ fileUrl: string; message: string }> {
    const fileUrl = await this.storageService.uploadFile(file, FileType.IMAGE, user);
    return {
      fileUrl,
      message: 'Imagen subida exitosamente',
    };
  }

  @Post('upload/document')
  @Roles(Role.MEMBER, Role.ADMIN, Role.OWNER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir documento directamente' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Documento subido exitosamente',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ fileUrl: string; message: string }> {
    const fileUrl = await this.storageService.uploadFile(file, FileType.DOCUMENT, user);
    return {
      fileUrl,
      message: 'Documento subido exitosamente',
    };
  }
}