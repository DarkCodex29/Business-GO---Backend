import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdenesVentaService } from '../services/ordenes-venta.service';
import { CreateOrdenVentaDto } from '../dto/create-orden-venta.dto';
import { UpdateOrdenVentaDto } from '../dto/update-orden-venta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Órdenes de Venta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/ordenes-venta')
export class OrdenesVentaController {
  constructor(private readonly ordenesVentaService: OrdenesVentaService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.CREATE] })
  @ApiOperation({
    summary: 'Crear una nueva orden de venta',
    description: 'Crea una nueva orden de venta con sus detalles',
  })
  @ApiResponse({
    status: 201,
    description: 'Orden de venta creada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o productos no disponibles',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa o cliente no encontrado',
  })
  create(
    @EmpresaId() empresaId: number,
    @Body() createOrdenVentaDto: CreateOrdenVentaDto,
  ) {
    return this.ordenesVentaService.create(empresaId, createOrdenVentaDto);
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.READ] })
  @ApiOperation({
    summary: 'Obtener todas las órdenes de venta',
    description:
      'Retorna una lista de todas las órdenes de venta en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes de venta recuperada exitosamente',
    type: [CreateOrdenVentaDto],
  })
  findAll(@EmpresaId() empresaId: number) {
    return this.ordenesVentaService.findAll(empresaId);
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.READ] })
  @ApiOperation({
    summary: 'Obtener una orden de venta por ID',
    description: 'Retorna los detalles de una orden de venta específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta encontrada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordenesVentaService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.UPDATE] })
  @ApiOperation({
    summary: 'Actualizar una orden de venta',
    description: 'Actualiza los datos de una orden de venta existente',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta actualizada exitosamente',
    type: UpdateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'No se puede modificar una orden de venta facturada o cancelada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  update(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrdenVentaDto: UpdateOrdenVentaDto,
  ) {
    return this.ordenesVentaService.update(id, empresaId, updateOrdenVentaDto);
  }

  @Delete(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.DELETE] })
  @ApiOperation({
    summary: 'Eliminar una orden de venta',
    description: 'Elimina una orden de venta del sistema',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una orden de venta facturada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  remove(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordenesVentaService.remove(id, empresaId);
  }

  @Patch(':id/aprobar')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.APPROVE] })
  @ApiOperation({
    summary: 'Aprobar una orden de venta',
    description: 'Cambia el estado de una orden de venta a aprobada',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta aprobada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'No se puede aprobar una orden de venta ya aprobada o cancelada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  aprobar(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordenesVentaService.aprobar(empresaId, id);
  }

  @Patch(':id/cancelar')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.CANCEL] })
  @ApiOperation({
    summary: 'Cancelar una orden de venta',
    description: 'Cambia el estado de una orden de venta a cancelada',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta cancelada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cancelar una orden de venta ya facturada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  cancelar(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordenesVentaService.cancelar(empresaId, id);
  }
}
