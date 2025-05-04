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
import { PagosService } from '../services/pagos.service';
import { CreatePagoDto } from '../dto/create-pago.dto';
import { UpdatePagoDto } from '../dto/update-pago.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.CREATE],
  })
  @ApiOperation({
    summary: 'Crear un nuevo pago',
    description: 'Crea un nuevo pago para una compra',
  })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Historial de compra o método de pago no encontrado',
  })
  create(@EmpresaId() empresaId: number, @Body() createPagoDto: CreatePagoDto) {
    return this.pagosService.create(empresaId, createPagoDto);
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.READ],
  })
  @ApiOperation({
    summary: 'Obtener todos los pagos',
    description: 'Retorna una lista de todos los pagos',
  })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  findAll(@EmpresaId() empresaId: number) {
    return this.pagosService.findAll(empresaId);
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.READ],
  })
  @ApiOperation({
    summary: 'Obtener un pago',
    description: 'Retorna los detalles de un pago específico',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Detalles del pago' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pagosService.findOne(empresaId, id);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.UPDATE],
  })
  @ApiOperation({
    summary: 'Actualizar un pago',
    description: 'Actualiza los datos de un pago existente',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Pago actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  update(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePagoDto: UpdatePagoDto,
  ) {
    return this.pagosService.update(empresaId, id, updatePagoDto);
  }

  @Delete(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.DELETE],
  })
  @ApiOperation({
    summary: 'Eliminar un pago',
    description: 'Elimina un pago del sistema',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Pago eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  remove(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pagosService.remove(empresaId, id);
  }

  @Post(':id/process')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.PROCESS],
  })
  @ApiOperation({
    summary: 'Procesar un pago',
    description: 'Procesa un pago para validarlo y completarlo',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Pago procesado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  processPago(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pagosService.processPago(empresaId, id);
  }
}
