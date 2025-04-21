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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReporteParamsDto } from '../dto/reporte-params.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.WRITE] })
  @ApiOperation({ summary: 'Crear un nuevo reporte' })
  @ApiResponse({ status: 201, description: 'Reporte creado exitosamente' })
  create(@Body() createReporteDto: CreateReporteDto, @Request() req) {
    return this.reportesService.create(createReporteDto, req.user.id_usuario);
  }

  @Get('ventas')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({ summary: 'Obtener reporte de ventas' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte de ventas generado' })
  getReporteVentas(@Query() params: ReporteParamsDto, @Request() req) {
    return this.reportesService.getReporteVentas(req.user.id_empresa, params);
  }

  @Get('productos')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener reporte de productos' })
  @ApiQuery({ name: 'incluir_bajos', required: false, type: Boolean })
  @ApiQuery({ name: 'umbral_minimo', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Reporte de productos generado' })
  getReporteProductos(@Query() params: ReporteParamsDto, @Request() req) {
    return this.reportesService.getReporteProductos(
      req.user.id_empresa,
      params,
    );
  }

  @Get('clientes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.CLIENTES.READ] })
  @ApiOperation({ summary: 'Obtener reporte de clientes' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte de clientes generado' })
  getReporteClientes(@Query() params: ReporteParamsDto, @Request() req) {
    return this.reportesService.getReporteClientes(req.user.id_empresa, params);
  }

  @Get('financiero')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.FINANCIERO.READ] })
  @ApiOperation({ summary: 'Obtener reporte financiero' })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Reporte financiero generado' })
  getReporteFinanciero(@Query() params: ReporteParamsDto, @Request() req) {
    return this.reportesService.getReporteFinanciero(
      req.user.id_empresa,
      params,
    );
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.READ] })
  @ApiOperation({ summary: 'Obtener todos los reportes' })
  @ApiResponse({ status: 200, description: 'Lista de reportes' })
  findAll(@Request() req) {
    return this.reportesService.findAll(req.user.id_empresa);
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.READ] })
  @ApiOperation({ summary: 'Obtener un reporte específico' })
  @ApiParam({ name: 'id', description: 'ID del reporte' })
  @ApiResponse({ status: 200, description: 'Detalles del reporte' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reportesService.findOne(id, req.user.id_empresa);
  }

  @Post(':id/ejecutar')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({
    permissions: [
      PERMISSIONS.REPORTES.VENTAS.EXPORT,
      PERMISSIONS.REPORTES.PRODUCTOS.EXPORT,
      PERMISSIONS.REPORTES.CLIENTES.EXPORT,
      PERMISSIONS.REPORTES.FINANCIERO.EXPORT,
    ],
  })
  @ApiOperation({ summary: 'Ejecutar un reporte' })
  @ApiParam({ name: 'id', description: 'ID del reporte' })
  @ApiResponse({ status: 200, description: 'Reporte ejecutado exitosamente' })
  ejecutarReporte(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reportesService.ejecutarReporte(
      id,
      req.user.id_empresa,
      req.user.id_usuario,
    );
  }
}
