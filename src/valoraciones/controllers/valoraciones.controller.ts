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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ValoracionesService } from '../services/valoraciones.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Valoraciones')
@ApiBearerAuth()
@Controller('valoraciones')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles('ADMIN', 'EMPRESA')
export class ValoracionesController {
  constructor(private readonly valoracionesService: ValoracionesService) {}

  @Post(':empresaId')
  @EmpresaPermissions('valoraciones.crear')
  @ApiOperation({ summary: 'Crear una nueva valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Valoración creada exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para crear valoraciones',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createValoracionDto: CreateValoracionDto,
  ) {
    return this.valoracionesService.create(empresaId, createValoracionDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions('valoraciones.ver')
  @ApiOperation({ summary: 'Obtener todas las valoraciones de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de valoraciones' })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.valoracionesService.findAll(empresaId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions('valoraciones.ver')
  @ApiOperation({ summary: 'Obtener una valoración por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({ status: 200, description: 'Valoración encontrada' })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.valoracionesService.findOne(+id, +empresaId);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('valoraciones.editar')
  @ApiOperation({ summary: 'Actualizar una valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({
    status: 200,
    description: 'Valoración actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateValoracionDto: UpdateValoracionDto,
  ) {
    return this.valoracionesService.update(+id, +empresaId, updateValoracionDto);
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('valoraciones.eliminar')
  @ApiOperation({ summary: 'Eliminar una valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({
    status: 200,
    description: 'Valoración eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.valoracionesService.remove(+id, +empresaId);
  }

  @Get(':empresaId/producto/:productoId')
  @EmpresaPermissions('valoraciones.ver')
  @ApiOperation({ summary: 'Obtener todas las valoraciones de un producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de valoraciones del producto',
  })
  findByProducto(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.valoracionesService.findByProducto(+empresaId, +productoId);
  }

  @Get(':empresaId/cliente/:clienteId')
  @EmpresaPermissions('valoraciones.ver')
  @ApiOperation({ summary: 'Obtener todas las valoraciones de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de valoraciones del cliente',
  })
  findByCliente(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('clienteId', ParseIntPipe) clienteId: number,
  ) {
    return this.valoracionesService.findByCliente(+empresaId, +clienteId);
  }
}
