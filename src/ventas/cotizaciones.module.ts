import { Module } from '@nestjs/common';
import { CotizacionesService } from './services/cotizaciones.service';
import { CotizacionesController } from './controllers/cotizaciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
  exports: [CotizacionesService],
})
export class CotizacionesModule {}
