import { Module } from '@nestjs/common';
import { InventarioController } from './controllers/inventario.controller';
import { InventarioService } from './services/inventario.service';
import { InventarioValidationService } from './services/inventario-validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProductosModule } from '../productos/products.module';

@Module({
  imports: [PrismaModule, AuthModule, ProductosModule],
  controllers: [InventarioController],
  providers: [InventarioService, InventarioValidationService],
  exports: [InventarioService, InventarioValidationService],
})
export class InventarioModule {}
