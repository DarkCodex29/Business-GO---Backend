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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StockService } from '../services/stock.service';
import { CreateStockDto } from '../dto/create-stock.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { CreateDisponibilidadDto } from '../dto/create-disponibilidad.dto';
import { UpdateDisponibilidadDto } from '../dto/update-disponibilidad.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
@Controller('stock/:empresaId')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Crear un nuevo registro de stock' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Stock creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createStockDto: CreateStockDto,
  ) {
    return this.stockService.create(+empresaId, createStockDto);
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener todos los registros de stock' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de stock' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.stockService.findAll(+empresaId);
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener un registro de stock por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del stock' })
  @ApiResponse({ status: 200, description: 'Stock encontrado' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.stockService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar un registro de stock' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del stock' })
  @ApiResponse({ status: 200, description: 'Stock actualizado' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.stockService.update(+id, +empresaId, updateStockDto);
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar un registro de stock' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del stock' })
  @ApiResponse({ status: 200, description: 'Stock eliminado' })
  @ApiResponse({ status: 404, description: 'Stock no encontrado' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.stockService.remove(+id, +empresaId);
  }

  @Post('disponibilidad')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Crear un nuevo registro de disponibilidad' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Disponibilidad creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  createDisponibilidad(
    @Param('empresaId') empresaId: string,
    @Body() createDisponibilidadDto: CreateDisponibilidadDto,
  ) {
    return this.stockService.createDisponibilidad(
      +empresaId,
      createDisponibilidadDto,
    );
  }

  @Get('disponibilidad')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener todos los registros de disponibilidad' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de disponibilidad' })
  findAllDisponibilidad(@Param('empresaId') empresaId: string) {
    return this.stockService.findAllDisponibilidad(+empresaId);
  }

  @Get('disponibilidad/:id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener un registro de disponibilidad por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la disponibilidad' })
  @ApiResponse({ status: 200, description: 'Disponibilidad encontrada' })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  findOneDisponibilidad(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.stockService.findOneDisponibilidad(+id, +empresaId);
  }

  @Patch('disponibilidad/:id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar un registro de disponibilidad' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la disponibilidad' })
  @ApiResponse({ status: 200, description: 'Disponibilidad actualizada' })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  updateDisponibilidad(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateDisponibilidadDto: UpdateDisponibilidadDto,
  ) {
    return this.stockService.updateDisponibilidad(
      +id,
      +empresaId,
      updateDisponibilidadDto,
    );
  }

  @Delete('disponibilidad/:id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar un registro de disponibilidad' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la disponibilidad' })
  @ApiResponse({ status: 200, description: 'Disponibilidad eliminada' })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  removeDisponibilidad(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.stockService.removeDisponibilidad(+id, +empresaId);
  }
}
