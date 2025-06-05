import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { OrdenesCompraController } from './controllers/ordenes-compra.controller';
import { ProveedoresController } from './controllers/proveedores.controller';
import { ComprasAvanzadoController } from './controllers/compras-avanzado.controller';
import { ComprasValidationService } from './services/compras-validation.service';
import { ComprasCalculationService } from './services/compras-calculation.service';
import { OrdenesCompraService } from './services/ordenes-compra.service';
import { ProveedoresService } from './services/proveedores.service';
import { ComprasPipelineService } from './services/compras-pipeline.service';
import { ComprasAnalyticsService } from './services/compras-analytics.service';
import { ComprasAutomationService } from './services/compras-automation.service';

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [
    OrdenesCompraController,
    ProveedoresController,
    ComprasAvanzadoController,
  ],
  providers: [
    // Servicios especializados aplicando SRP
    ComprasValidationService,
    ComprasCalculationService,

    // Servicios principales
    OrdenesCompraService,
    ProveedoresService,

    // Servicios avanzados (Optimización #12)
    ComprasPipelineService,
    ComprasAnalyticsService,
    ComprasAutomationService,
  ],
  exports: [
    ComprasValidationService,
    ComprasCalculationService,
    OrdenesCompraService,
    ProveedoresService,
    ComprasPipelineService,
    ComprasAnalyticsService,
    ComprasAutomationService,
  ],
})
export class ComprasModule {}
