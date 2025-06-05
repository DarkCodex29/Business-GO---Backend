import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CotizacionesController } from './controllers/cotizaciones.controller';
import { CotizacionesService } from './services/cotizaciones.service';
import { VentasValidationService } from './services/ventas-validation.service';
import { VentasCalculationService } from './services/ventas-calculation.service';
import { OrdenesVentaController } from './controllers/ordenes-venta.controller';
import { OrdenesVentaService } from './services/ordenes-venta.service';
import { FacturasController } from './controllers/facturas.controller';
import { FacturasService } from './services/facturas.service';
import { NotasCreditoController } from './controllers/notas-credito.controller';
import { NotasCreditoService } from './services/notas-credito.service';
import { NotasDebitoController } from './controllers/notas-debito.controller';
import { NotasDebitoService } from './services/notas-debito.service';
import { ReembolsosController } from './controllers/reembolsos.controller';
import { ReembolsosService } from './services/reembolsos.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CotizacionesController,
    OrdenesVentaController,
    FacturasController,
    NotasCreditoController,
    NotasDebitoController,
    ReembolsosController,
  ],
  providers: [
    // Servicios especializados aplicando SRP
    VentasValidationService,
    VentasCalculationService,

    // Servicios principales
    CotizacionesService,
    OrdenesVentaService,
    FacturasService,
    NotasCreditoService,
    NotasDebitoService,
    ReembolsosService,
  ],
  exports: [
    VentasValidationService,
    VentasCalculationService,
    CotizacionesService,
    OrdenesVentaService,
    FacturasService,
    NotasCreditoService,
    NotasDebitoService,
    ReembolsosService,
  ],
})
export class VentasModule {}
