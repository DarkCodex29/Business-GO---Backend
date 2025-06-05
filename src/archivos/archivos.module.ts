import { Module } from '@nestjs/common';
import { ArchivosService } from './services/archivos.service';
import { ArchivosValidationService } from './services/archivos-validation.service';
import { ArchivosCalculationService } from './services/archivos-calculation.service';
import { ArchivosController } from './archivos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArchivosController],
  providers: [
    ArchivosService,
    ArchivosValidationService,
    ArchivosCalculationService,
  ],
  exports: [
    ArchivosService,
    ArchivosValidationService,
    ArchivosCalculationService,
  ],
})
export class ArchivosModule {}
