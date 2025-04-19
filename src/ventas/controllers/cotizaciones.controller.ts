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
import { CotizacionesService } from '../services/cotizaciones.service';
import { CreateCotizacionDto } from '../dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from '../dto/update-cotizacion.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('cotizaciones')
@Roles('ADMIN', 'EMPRESA')
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post(':empresaId')
  @EmpresaPermissions('cotizaciones.crear')
  @ApiOperation({
    summary: 'Crear una nueva cotización',
    description: 'Crea una nueva cotización con sus detalles',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Cotización creada exitosamente',
    type: CreateCotizacionDto,
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
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createCotizacionDto: CreateCotizacionDto,
  ) {
    return this.cotizacionesService.create(empresaId, createCotizacionDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions('cotizaciones.ver')
  @ApiOperation({
    summary: 'Obtener todas las cotizaciones',
    description: 'Retorna una lista de todas las cotizaciones en el sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cotizaciones recuperada exitosamente',
    type: [CreateCotizacionDto],
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.cotizacionesService.findAll(empresaId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions('cotizaciones.ver')
  @ApiOperation({
    summary: 'Obtener una cotización por ID',
    description: 'Retorna los detalles de una cotización específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({
    status: 200,
    description: 'Cotización encontrada exitosamente',
    type: CreateCotizacionDto,
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cotizacionesService.findOne(+empresaId, +id);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('cotizaciones.editar')
  @ApiOperation({
    summary: 'Actualizar una cotización',
    description: 'Actualiza los datos de una cotización existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({
    status: 200,
    description: 'Cotización actualizada exitosamente',
    type: UpdateCotizacionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una cotización convertida o vencida',
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
  ) {
    return this.cotizacionesService.update(
      +empresaId,
      +id,
      updateCotizacionDto,
    );
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('cotizaciones.eliminar')
  @ApiOperation({
    summary: 'Eliminar una cotización',
    description: 'Elimina una cotización del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({
    status: 200,
    description: 'Cotización eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una cotización convertida',
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cotizacionesService.remove(+empresaId, +id);
  }
}
