import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      // Configuración de Multer para archivos en memoria
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB máximo
      },
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}