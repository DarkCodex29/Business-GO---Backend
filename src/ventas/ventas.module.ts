import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotasDebitoModule } from './notas-debito.module';
import { CotizacionesModule } from './cotizaciones.module';
import { OrdenesVentaModule } from './ordenes-venta.module';
import { FacturasModule } from './facturas.module';
import { NotasCreditoModule } from './notas-credito.module';

@Module({
  imports: [
    PrismaModule,
    NotasDebitoModule,
    CotizacionesModule,
    OrdenesVentaModule,
    FacturasModule,
    NotasCreditoModule,
  ],
  exports: [
    NotasDebitoModule,
    CotizacionesModule,
    OrdenesVentaModule,
    FacturasModule,
    NotasCreditoModule,
  ],
})
export class VentasModule {}
