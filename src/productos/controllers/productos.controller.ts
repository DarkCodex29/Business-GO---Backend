import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductosService } from '../services/productos.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo producto o servicio' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos y servicios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos obtenida exitosamente',
  })
  findAll() {
    return this.productosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto o servicio por ID' })
  @ApiResponse({ status: 200, description: 'Producto encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un producto o servicio' })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un producto o servicio' })
  @ApiResponse({ status: 200, description: 'Producto eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.remove(id);
  }
}
