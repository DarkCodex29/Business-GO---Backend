import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
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
import { InventarioService } from '../services/inventario.service';
import { UpdateInventarioStockDto } from '../dto/update-stock.dto';
import { UpdateInventarioDisponibilidadDto } from '../dto/update-disponibilidad.dto';

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get(':empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todo el inventario de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Inventario obtenido exitosamente' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.inventarioService.findAll(+empresaId);
  }

  @Get(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener un producto del inventario por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.inventarioService.findOne(+id, +empresaId);
  }

  @Get(':empresaId/stock/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener stock de un producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Stock encontrado' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  getStock(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.inventarioService.getStock(+id, +empresaId);
  }

  @Get(':empresaId/disponibilidad/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener disponibilidad de un producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Disponibilidad encontrada' })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  getDisponibilidad(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.inventarioService.getDisponibilidad(+id, +empresaId);
  }

  @Patch(':empresaId/stock/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar el stock de un producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  updateStock(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateStockDto: UpdateInventarioStockDto,
  ) {
    return this.inventarioService.updateStock(
      +id,
      updateStockDto.cantidad,
      +empresaId,
    );
  }

  @Patch(':empresaId/disponibilidad/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar la disponibilidad de un producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  updateDisponibilidad(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateDisponibilidadDto: UpdateInventarioDisponibilidadDto,
  ) {
    return this.inventarioService.updateDisponibilidad(
      +id,
      updateDisponibilidadDto.disponible,
      +empresaId,
    );
  }

  @Get(':empresaId/stock-bajo/:umbral')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener productos con stock bajo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'umbral', description: 'Cantidad mínima de stock' })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos con stock bajo',
  })
  getStockBajo(
    @Param('empresaId') empresaId: string,
    @Param('umbral') umbral: string,
  ) {
    return this.inventarioService.getStockBajo(+umbral, +empresaId);
  }

  @Get(':empresaId/sin-stock')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener productos sin stock' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de productos sin stock' })
  getProductosSinStock(@Param('empresaId') empresaId: string) {
    return this.inventarioService.getProductosSinStock(+empresaId);
  }

  @Get(':empresaId/agotados')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener productos agotados' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de productos agotados' })
  getProductosAgotados(@Param('empresaId') empresaId: string) {
    return this.inventarioService.getProductosAgotados(+empresaId);
  }
}
