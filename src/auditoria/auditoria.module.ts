import { Module } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './services/auditoria.service';
import { BaseAuditoriaService } from './services/base-auditoria.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Módulo de Auditoría
 * Configura todos los componentes necesarios para el sistema de auditoría
 * Principios SOLID aplicados:
 * - Single Responsibility: Configuración del módulo de auditoría
 * - Dependency Inversion: Inyección de dependencias configurada
 * - Open/Closed: Extensible mediante providers adicionales
 */
@Module({
  imports: [
    PrismaModule, // Importar módulo de Prisma para acceso a base de datos
  ],
  controllers: [
    AuditoriaController, // Controlador REST para endpoints de auditoría
  ],
  providers: [
    AuditoriaService, // Servicio principal de auditoría
    {
      provide: BaseAuditoriaService,
      useClass: AuditoriaService, // Usar AuditoriaService como implementación de BaseAuditoriaService
    },
  ],
  exports: [
    AuditoriaService, // Exportar servicio para uso en otros módulos
    BaseAuditoriaService, // Exportar clase base para extensibilidad
  ],
})
export class AuditoriaModule {}
