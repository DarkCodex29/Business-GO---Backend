import { Module } from '@nestjs/common';
import { ReportesController } from './controllers/reportes.controller';
import { ReportesService } from './services/reportes.service';
import { ReportesRefactoredService } from './services/reportes-refactored.service';
import { ReportesValidationService } from './services/reportes-validation.service';
import { ReportesCalculationService } from './services/reportes-calculation.service';
import { BaseReportesService } from './services/base-reportes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ReportesController, // Controlador principal mejorado (mantiene rutas /reportes)
  ],
  providers: [
    // Servicios especializados aplicando SRP
    ReportesValidationService,
    ReportesCalculationService,

    // Servicio base con Template Method Pattern

    // Servicio principal refactorizado
    ReportesRefactoredService,

    // Servicio original (mantener compatibilidad para otros módulos)
    ReportesService,

    // Alias para usar el servicio refactorizado por defecto
    {
      provide: 'REPORTES_SERVICE',
      useClass: ReportesRefactoredService,
    },
  ],
  exports: [
    ReportesService,
    ReportesRefactoredService,
    ReportesValidationService,
    ReportesCalculationService,
    'REPORTES_SERVICE',
  ],
})
export class ReportesModule {}
