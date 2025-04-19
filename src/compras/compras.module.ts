import { Module } from '@nestjs/common';
import { OrdenesCompraService } from './services/ordenes-compra.service';
import { OrdenesCompraController } from './controllers/ordenes-compra.controller';
import { ProveedoresService } from './services/proveedores.service';
import { ProveedoresController } from './controllers/proveedores.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrdenesCompraController, ProveedoresController],
  providers: [OrdenesCompraService, ProveedoresService],
  exports: [OrdenesCompraService, ProveedoresService],
})
export class ComprasModule {}
