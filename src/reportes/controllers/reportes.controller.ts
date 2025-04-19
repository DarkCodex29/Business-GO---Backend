import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
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

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empresas/:empresaId/reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear un nuevo reporte' })
  @ApiResponse({ status: 201, description: 'Reporte creado exitosamente' })
  create(@Body() createReporteDto: CreateReporteDto, @Request() req) {
    return this.reportesService.create(createReporteDto, req.user.id_usuario);
  }

  @Get('ventas')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener reporte de ventas' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte de ventas generado' })
  getReporteVentas(
    @Param('empresaId') empresaId: string,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteVentas(+empresaId, params);
  }

  @Get('productos')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener reporte de productos' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'incluir_bajos', required: false, type: Boolean })
  @ApiQuery({ name: 'umbral_minimo', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Reporte de productos generado' })
  getReporteProductos(
    @Param('empresaId') empresaId: string,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteProductos(+empresaId, params);
  }

  @Get('clientes')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener reporte de clientes' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte de clientes generado' })
  getReporteClientes(
    @Param('empresaId') empresaId: string,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteClientes(+empresaId, params);
  }

  @Get('financiero')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener reporte financiero' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte financiero generado' })
  getReporteFinanciero(
    @Param('empresaId') empresaId: string,
    @Query() params: ReporteParamsDto,
  ) {
    return this.reportesService.getReporteFinanciero(+empresaId, params);
  }

  @Get('empresa/:empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los reportes de una empresa' })
  @ApiResponse({ status: 200, description: 'Lista de reportes' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.reportesService.findAll(+empresaId);
  }

  @Get(':id/empresa/:empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener un reporte específico' })
  @ApiResponse({ status: 200, description: 'Detalles del reporte' })
  findOne(@Param('id') id: string, @Param('empresaId') empresaId: string) {
    return this.reportesService.findOne(+id, +empresaId);
  }

  @Post(':id/ejecutar/empresa/:empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Ejecutar un reporte' })
  @ApiResponse({ status: 200, description: 'Reporte ejecutado exitosamente' })
  ejecutarReporte(
    @Param('id') id: string,
    @Param('empresaId') empresaId: string,
    @Request() req,
  ) {
    return this.reportesService.ejecutarReporte(
      +id,
      +empresaId,
      req.user.id_usuario,
    );
  }
}
