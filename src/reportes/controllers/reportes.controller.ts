import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportesService } from '../services/reportes.service';
import { CreateReporteDto } from '../dto/create-reporte.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReporteParamsDto } from '../dto/reporte-params.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post(':empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.crear')
  @ApiOperation({ summary: 'Crear un nuevo reporte' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Reporte creado exitosamente' })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createReporteDto: CreateReporteDto,
    @Request() req,
  ) {
    return this.reportesService.create(createReporteDto, req.user.id_usuario);
  }

  @Get(':empresaId/ventas')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ver')
  @ApiOperation({ summary: 'Obtener reporte de ventas' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte de ventas generado' })
  getReporteVentas(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteVentas(empresaId, params);
  }

  @Get(':empresaId/productos')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ver')
  @ApiOperation({ summary: 'Obtener reporte de productos' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'incluir_bajos', required: false, type: Boolean })
  @ApiQuery({ name: 'umbral_minimo', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Reporte de productos generado' })
  getReporteProductos(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteProductos(empresaId, params);
  }

  @Get(':empresaId/clientes')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ver')
  @ApiOperation({ summary: 'Obtener reporte de clientes' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte de clientes generado' })
  getReporteClientes(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteClientes(empresaId, params);
  }

  @Get(':empresaId/financiero')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ver')
  @ApiOperation({ summary: 'Obtener reporte financiero' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte financiero generado' })
  getReporteFinanciero(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteFinanciero(empresaId, params);
  }

  @Get(':empresaId/empresa/:empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ver')
  @ApiOperation({ summary: 'Obtener todos los reportes de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de reportes' })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.reportesService.findAll(empresaId);
  }

  @Get(':empresaId/:id/empresa/:empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ver')
  @ApiOperation({ summary: 'Obtener un reporte específico' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reporte' })
  @ApiResponse({ status: 200, description: 'Detalles del reporte' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportesService.findOne(id, empresaId);
  }

  @Post(':empresaId/:id/ejecutar/empresa/:empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('reportes.ejecutar')
  @ApiOperation({ summary: 'Ejecutar un reporte' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reporte' })
  @ApiResponse({ status: 200, description: 'Reporte ejecutado exitosamente' })
  ejecutarReporte(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.reportesService.ejecutarReporte(
      id,
      empresaId,
      req.user.id_usuario,
    );
  }
}
