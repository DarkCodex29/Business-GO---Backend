import { Module } from '@nestjs/common';
import { OrdenesVentaService } from './services/ordenes-venta.service';
import { OrdenesVentaController } from './controllers/ordenes-venta.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrdenesVentaController],
  providers: [OrdenesVentaService],
  exports: [OrdenesVentaService],
})
export class OrdenesVentaModule {}
