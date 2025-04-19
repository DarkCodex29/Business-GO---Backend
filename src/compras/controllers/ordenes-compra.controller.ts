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
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdenesCompraService } from '../services/ordenes-compra.service';
import { CreateOrdenCompraDto } from '../dto/create-orden-compra.dto';
import { CreateFacturaCompraDto } from '../dto/create-factura-compra.dto';
import { CreatePagoCompraDto } from '../dto/create-pago-compra.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Órdenes de Compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private readonly ordenesCompraService: OrdenesCompraService) {}

  @Post(':empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear una nueva orden de compra' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 201,
    description: 'Orden de compra creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Body() createOrdenCompraDto: CreateOrdenCompraDto,
    @Param('empresaId') empresaId: string,
  ) {
    return this.ordenesCompraService.create(createOrdenCompraDto, +empresaId);
  }

  @Get(':empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener todas las órdenes de compra de una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Lista de órdenes de compra' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.ordenesCompraService.findAll(+empresaId);
  }

  @Get(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener una orden de compra por ID' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de compra',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Orden de compra encontrada' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findOne(@Param('id') id: string, @Param('empresaId') empresaId: string) {
    return this.ordenesCompraService.findOne(+id, +empresaId);
  }

  @Patch(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar una orden de compra' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de compra',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Orden de compra actualizada' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  update(
    @Param('id') id: string,
    @Body() updateOrdenCompraDto: Partial<CreateOrdenCompraDto>,
    @Param('empresaId') empresaId: string,
  ) {
    return this.ordenesCompraService.update(
      +id,
      updateOrdenCompraDto,
      +empresaId,
    );
  }

  @Delete(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Cancelar una orden de compra' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de compra',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Orden de compra cancelada' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  remove(@Param('id') id: string, @Param('empresaId') empresaId: string) {
    return this.ordenesCompraService.remove(+id, +empresaId);
  }

  @Post(':empresaId/:id/facturas')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Agregar una factura a una orden de compra' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de compra',
    type: 'number',
  })
  @ApiResponse({ status: 201, description: 'Factura agregada exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  addFactura(
    @Param('id') id: string,
    @Body() facturaData: CreateFacturaCompraDto,
    @Param('empresaId') empresaId: string,
  ) {
    return this.ordenesCompraService.addFactura(+id, facturaData, +empresaId);
  }

  @Post(':empresaId/facturas/:idFactura/pagos')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Agregar un pago a una factura de compra' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'idFactura',
    description: 'ID de la factura',
    type: 'number',
  })
  @ApiResponse({ status: 201, description: 'Pago agregado exitosamente' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  addPago(
    @Param('idFactura') idFactura: string,
    @Body() pagoData: CreatePagoCompraDto,
    @Param('empresaId') empresaId: string,
  ) {
    return this.ordenesCompraService.addPago(+idFactura, pagoData, +empresaId);
  }
}
