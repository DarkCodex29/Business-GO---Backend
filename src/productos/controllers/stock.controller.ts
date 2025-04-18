import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockService } from '../services/stock.service';
import { CreateStockDto } from '../dto/create-stock.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { CreateDisponibilidadDto } from '../dto/create-disponibilidad.dto';
import { UpdateDisponibilidadDto } from '../dto/update-disponibilidad.dto';

@ApiTags('Stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // Stock endpoints
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de stock' })
  @ApiResponse({ status: 201, description: 'Stock creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un registro de stock para este producto',
  })
  createStock(@Body() createStockDto: CreateStockDto) {
    return this.stockService.createStock(createStockDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los registros de stock' })
  @ApiResponse({
    status: 200,
    description: 'Lista de stock obtenida exitosamente',
  })
  findAllStock() {
    return this.stockService.findAllStock();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de stock por ID' })
  @ApiResponse({ status: 200, description: 'Stock encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  findOneStock(@Param('id') id: string) {
    return this.stockService.findOneStock(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un registro de stock' })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.updateStock(+id, updateStockDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un registro de stock' })
  @ApiResponse({ status: 200, description: 'Stock eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  removeStock(@Param('id') id: string) {
    return this.stockService.removeStock(+id);
  }

  // Disponibilidad endpoints
  @Post('disponibilidad')
  @ApiOperation({ summary: 'Crear un nuevo registro de disponibilidad' })
  @ApiResponse({
    status: 201,
    description: 'Disponibilidad creada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un registro de disponibilidad para este producto',
  })
  createDisponibilidad(
    @Body() createDisponibilidadDto: CreateDisponibilidadDto,
  ) {
    return this.stockService.createDisponibilidad(createDisponibilidadDto);
  }

  @Get('disponibilidad')
  @ApiOperation({ summary: 'Obtener todos los registros de disponibilidad' })
  @ApiResponse({
    status: 200,
    description: 'Lista de disponibilidad obtenida exitosamente',
  })
  findAllDisponibilidad() {
    return this.stockService.findAllDisponibilidad();
  }

  @Get('disponibilidad/:id')
  @ApiOperation({ summary: 'Obtener un registro de disponibilidad por ID' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  findOneDisponibilidad(@Param('id') id: string) {
    return this.stockService.findOneDisponibilidad(+id);
  }

  @Patch('disponibilidad/:id')
  @ApiOperation({ summary: 'Actualizar un registro de disponibilidad' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  updateDisponibilidad(
    @Param('id') id: string,
    @Body() updateDisponibilidadDto: UpdateDisponibilidadDto,
  ) {
    return this.stockService.updateDisponibilidad(+id, updateDisponibilidadDto);
  }

  @Delete('disponibilidad/:id')
  @ApiOperation({ summary: 'Eliminar un registro de disponibilidad' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  removeDisponibilidad(@Param('id') id: string) {
    return this.stockService.removeDisponibilidad(+id);
  }
}
