import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdenesVentaService } from '../services/ordenes-venta.service';
import { CreateOrdenVentaDto } from '../dto/create-orden-venta.dto';
import { UpdateOrdenVentaDto } from '../dto/update-orden-venta.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Órdenes de Venta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/ordenes-venta')
export class OrdenesVentaController {
  constructor(private readonly ordenesVentaService: OrdenesVentaService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('ordenes_venta.crear')
  @ApiOperation({
    summary: 'Crear una nueva orden de venta',
    description: 'Crea una nueva orden de venta en el sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Orden de venta creada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la cotización no está en estado pendiente',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa, cliente, cotización o producto no encontrado',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createOrdenVentaDto: CreateOrdenVentaDto,
  ) {
    return this.ordenesVentaService.create(empresaId, createOrdenVentaDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('ordenes_venta.ver')
  @ApiOperation({
    summary: 'Obtener todas las órdenes de venta',
    description:
      'Retorna una lista de todas las órdenes de venta de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes de venta recuperada exitosamente',
    type: [CreateOrdenVentaDto],
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.ordenesVentaService.findAll(empresaId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('ordenes_venta.ver')
  @ApiOperation({
    summary: 'Obtener una orden de venta',
    description: 'Retorna una orden de venta específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de venta',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta encontrada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordenesVentaService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('ordenes_venta.editar')
  @ApiOperation({
    summary: 'Actualizar una orden de venta',
    description: 'Actualiza una orden de venta existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de venta',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta actualizada exitosamente',
    type: UpdateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una orden de venta facturada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrdenVentaDto: UpdateOrdenVentaDto,
  ) {
    return this.ordenesVentaService.update(id, empresaId, updateOrdenVentaDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('ordenes_venta.eliminar')
  @ApiOperation({
    summary: 'Eliminar una orden de venta',
    description: 'Elimina una orden de venta del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de venta',
    type: 'number',
    example: 1,
  })
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
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordenesVentaService.remove(id, empresaId);
  }
}
