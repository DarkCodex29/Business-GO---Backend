import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdenesCompraController } from './controllers/ordenes-compra.controller';
import { ProveedoresController } from './controllers/proveedores.controller';
import { ComprasValidationService } from './services/compras-validation.service';
import { ComprasCalculationService } from './services/compras-calculation.service';
import { OrdenesCompraService } from './services/ordenes-compra.service';
import { ProveedoresService } from './services/proveedores.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdenesCompraController, ProveedoresController],
  providers: [
    // Servicios especializados aplicando SRP
    ComprasValidationService,
    ComprasCalculationService,

    // Servicios principales
    OrdenesCompraService,
    ProveedoresService,
  ],
  exports: [
    ComprasValidationService,
    ComprasCalculationService,
    OrdenesCompraService,
    ProveedoresService,
  ],
})
export class ComprasModule {}
