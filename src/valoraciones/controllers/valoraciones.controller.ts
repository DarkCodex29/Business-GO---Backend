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
import { ValoracionesService } from '../services/valoraciones.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Valoraciones')
@ApiBearerAuth()
@Controller('valoraciones')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
export class ValoracionesController {
  constructor(private readonly valoracionesService: ValoracionesService) {}

  @Post(':empresaId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.CREATE] })
  @ApiOperation({ summary: 'Crear una nueva valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Valoración creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para crear valoraciones',
  })
  @ApiResponse({ status: 404, description: 'Cliente o producto no encontrado' })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createValoracionDto: CreateValoracionDto,
  ) {
    return this.valoracionesService.create(empresaId, createValoracionDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.VIEW] })
  @ApiOperation({ summary: 'Obtener todas las valoraciones de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de valoraciones' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para ver valoraciones',
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.valoracionesService.findAll(empresaId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.VIEW] })
  @ApiOperation({ summary: 'Obtener una valoración por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({ status: 200, description: 'Valoración encontrada' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para ver valoraciones',
  })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.valoracionesService.findOne(+id, +empresaId);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.EDIT] })
  @ApiOperation({ summary: 'Actualizar una valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({
    status: 200,
    description: 'Valoración actualizada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para editar valoraciones',
  })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateValoracionDto: UpdateValoracionDto,
  ) {
    return this.valoracionesService.update(
      +id,
      +empresaId,
      updateValoracionDto,
    );
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.DELETE] })
  @ApiOperation({ summary: 'Eliminar una valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({
    status: 200,
    description: 'Valoración eliminada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para eliminar valoraciones',
  })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.valoracionesService.remove(+id, +empresaId);
  }

  @Get(':empresaId/producto/:productoId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.VIEW] })
  @ApiOperation({ summary: 'Obtener valoraciones por producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de valoraciones del producto',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para ver valoraciones',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findByProducto(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.valoracionesService.findByProducto(productoId, empresaId);
  }

  @Get(':empresaId/cliente/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.VALORACIONES.VIEW] })
  @ApiOperation({ summary: 'Obtener valoraciones por cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de valoraciones del cliente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para ver valoraciones',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findByCliente(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('clienteId', ParseIntPipe) clienteId: number,
  ) {
    return this.valoracionesService.findByCliente(clienteId, empresaId);
  }
}
