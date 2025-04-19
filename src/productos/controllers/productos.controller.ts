import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ProductosService } from '../services/productos.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empresas/:empresaId/productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear un nuevo producto o servicio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createProductoDto: CreateProductoDto,
  ) {
    return this.productosService.create(+empresaId, createProductoDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener todos los productos y servicios de una empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.productosService.findAll(+empresaId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener un producto o servicio por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.productosService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar un producto o servicio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(+id, +empresaId, updateProductoDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un producto o servicio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.productosService.remove(+id, +empresaId);
  }
}
