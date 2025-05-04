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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/cotizaciones')
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.CREATE] })
  @ApiOperation({
    summary: 'Crear una nueva cotización',
    description: 'Crea una nueva cotización con sus detalles',
  })
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
    @EmpresaId() empresaId: number,
    @Body() createCotizacionDto: CreateCotizacionDto,
  ) {
    return this.cotizacionesService.create(empresaId, createCotizacionDto);
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.READ] })
  @ApiOperation({
    summary: 'Obtener todas las cotizaciones',
    description: 'Retorna una lista de todas las cotizaciones en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cotizaciones recuperada exitosamente',
    type: [CreateCotizacionDto],
  })
  findAll(@EmpresaId() empresaId: number) {
    return this.cotizacionesService.findAll(empresaId);
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.READ] })
  @ApiOperation({
    summary: 'Obtener una cotización por ID',
    description: 'Retorna los detalles de una cotización específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({
    status: 200,
    description: 'Cotización encontrada exitosamente',
    type: CreateCotizacionDto,
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cotizacionesService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.UPDATE] })
  @ApiOperation({
    summary: 'Actualizar una cotización',
    description: 'Actualiza los datos de una cotización existente',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
  ) {
    return this.cotizacionesService.update(id, empresaId, updateCotizacionDto);
  }

  @Delete(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.DELETE] })
  @ApiOperation({
    summary: 'Eliminar una cotización',
    description: 'Elimina una cotización del sistema',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cotizacionesService.remove(id, empresaId);
  }
}
