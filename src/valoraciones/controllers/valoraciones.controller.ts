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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ValoracionesService } from '../services/valoraciones.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';

@ApiTags('Valoraciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empresas/:empresaId/valoraciones')
export class ValoracionesController {
  constructor(private readonly valoracionesService: ValoracionesService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({ summary: 'Crear una nueva valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Valoración creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createValoracionDto: CreateValoracionDto,
  ) {
    return this.valoracionesService.create(+empresaId, createValoracionDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener todas las valoraciones de una empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de valoraciones' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.valoracionesService.findAll(+empresaId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener una valoración por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({ status: 200, description: 'Valoración encontrada' })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.valoracionesService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({ summary: 'Actualizar una valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({ status: 200, description: 'Valoración actualizada' })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateValoracionDto: UpdateValoracionDto,
  ) {
    return this.valoracionesService.update(
      +id,
      +empresaId,
      updateValoracionDto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar una valoración' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la valoración' })
  @ApiResponse({ status: 200, description: 'Valoración eliminada' })
  @ApiResponse({ status: 404, description: 'Valoración no encontrada' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.valoracionesService.remove(+id, +empresaId);
  }

  @Get('producto/:productoId')
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({
    summary: 'Obtener todas las valoraciones de un producto',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de valoraciones del producto',
  })
  findByProducto(
    @Param('empresaId') empresaId: string,
    @Param('productoId') productoId: string,
  ) {
    return this.valoracionesService.findByProducto(+productoId, +empresaId);
  }

  @Get('cliente/:clienteId')
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({
    summary: 'Obtener todas las valoraciones de un cliente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de valoraciones del cliente',
  })
  findByCliente(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
  ) {
    return this.valoracionesService.findByCliente(+clienteId, +empresaId);
  }
}
