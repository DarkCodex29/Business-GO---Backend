import { Module } from '@nestjs/common';
import { ArchivosController } from './controllers/archivos.controller';
import { ArchivosService } from './services/archivos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class ArchivosModule {}
