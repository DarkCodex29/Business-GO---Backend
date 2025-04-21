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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Órdenes de Compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private readonly ordenesCompraService: OrdenesCompraService) {}

  @Post(':empresaId')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.WRITE] })
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
    @Param('empresaId') empresaId: number,
  ) {
    return this.ordenesCompraService.create(createOrdenCompraDto, empresaId);
  }

  @Get(':empresaId')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Obtener todas las órdenes de compra de una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes de compra',
  })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.ordenesCompraService.findAll(+empresaId);
  }

  @Get(':empresaId/:id')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.READ] })
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
  @ApiResponse({
    status: 200,
    description: 'Orden de compra encontrada',
  })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  findOne(@Param('id') id: string, @Param('empresaId') empresaId: string) {
    return this.ordenesCompraService.findOne(+id, +empresaId);
  }

  @Patch(':empresaId/:id')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.WRITE] })
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
  @ApiResponse({
    status: 200,
    description: 'Orden de compra actualizada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  update(
    @Param('id') id: number,
    @Body() updateOrdenCompraDto: Partial<CreateOrdenCompraDto>,
    @Param('empresaId') empresaId: number,
  ) {
    return this.ordenesCompraService.update(
      id,
      updateOrdenCompraDto,
      empresaId,
    );
  }

  @Delete(':empresaId/:id')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.WRITE] })
  @ApiOperation({ summary: 'Eliminar una orden de compra' })
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
  @ApiResponse({
    status: 200,
    description: 'Orden de compra eliminada exitosamente',
  })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  remove(@Param('id') id: string, @Param('empresaId') empresaId: string) {
    return this.ordenesCompraService.remove(+id, +empresaId);
  }

  @Post(':empresaId/:id/factura')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.WRITE] })
  @ApiOperation({ summary: 'Añadir una factura a una orden de compra' })
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
  @ApiResponse({
    status: 201,
    description: 'Factura añadida exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  addFactura(
    @Param('id') id: number,
    @Body() facturaData: CreateFacturaCompraDto,
    @Param('empresaId') empresaId: number,
  ) {
    return this.ordenesCompraService.addFactura(id, facturaData, empresaId);
  }

  @Post(':empresaId/factura/:idFactura/pago')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.WRITE] })
  @ApiOperation({ summary: 'Añadir un pago a una factura de compra' })
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
  @ApiResponse({
    status: 201,
    description: 'Pago añadido exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  addPago(
    @Param('idFactura') idFactura: number,
    @Body() pagoData: CreatePagoCompraDto,
    @Param('empresaId') empresaId: number,
  ) {
    return this.ordenesCompraService.addPago(idFactura, pagoData, empresaId);
  }
}
