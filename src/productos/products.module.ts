import { Module } from '@nestjs/common';
import { ProductosService } from './services/productos.service';
import { ProductosController } from './controllers/productos.controller';
import { StockService } from './services/stock.service';
import { StockController } from './controllers/stock.controller';
import { PreciosService } from './services/precios.service';
import { PreciosController } from './controllers/precios.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AtributosController } from './controllers/atributos.controller';
import { CategoriasController } from './controllers/categorias.controller';
import { SubcategoriasController } from './controllers/subcategorias.controller';
import { AtributosService } from './services/atributos.service';
import { CategoriasService } from './services/categorias.service';
import { SubcategoriasService } from './services/subcategorias.service';

@Module({
  controllers: [
    ProductosController,
    StockController,
    PreciosController,
    AtributosController,
    CategoriasController,
    SubcategoriasController,
  ],
  providers: [
    ProductosService,
    StockService,
    PreciosService,
    AtributosService,
    CategoriasService,
    SubcategoriasService,
    PrismaService,
  ],
  exports: [
    ProductosService,
    StockService,
    PreciosService,
    AtributosService,
    CategoriasService,
    SubcategoriasService,
  ],
})
export class ProductsModule {}
