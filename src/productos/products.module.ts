import { Module } from '@nestjs/common';
import { ProductosService } from './services/productos.service';
import { ProductosController } from './controllers/productos.controller';
import { StockService } from './services/stock.service';
import { StockController } from './controllers/stock.controller';
import { PreciosService } from './services/precios.service';
import { PreciosController } from './controllers/precios.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProductosController, StockController, PreciosController],
  providers: [ProductosService, StockService, PreciosService, PrismaService],
  exports: [ProductosService, StockService, PreciosService],
})
export class ProductsModule {}
