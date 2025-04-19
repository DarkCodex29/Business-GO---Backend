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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StockService } from '../services/stock.service';
import { CreateStockDto } from '../dto/create-stock.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { CreateDisponibilidadDto } from '../dto/create-disponibilidad.dto';
import { UpdateDisponibilidadDto } from '../dto/update-disponibilidad.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // Stock endpoints
  @Post()
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar un registro de stock' })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.updateStock(+id, updateStockDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un registro de stock' })
  @ApiResponse({ status: 200, description: 'Stock eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  removeStock(@Param('id') id: string) {
    return this.stockService.removeStock(+id);
  }

  // Disponibilidad endpoints
  @Post('disponibilidad')
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
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
