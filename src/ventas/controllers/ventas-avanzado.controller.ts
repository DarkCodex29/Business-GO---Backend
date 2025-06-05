import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

import {
  VentasPipelineService,
  IConversionRequest,
} from '../services/ventas-pipeline.service';
import { VentasAnalyticsService } from '../services/ventas-analytics.service';
import { VentasAutomationService } from '../services/ventas-automation.service';

@ApiTags('Ventas Avanzado')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/ventas-avanzado')
export class VentasAvanzadoController {
  constructor(
    private readonly ventasPipelineService: VentasPipelineService,
    private readonly ventasAnalyticsService: VentasAnalyticsService,
    private readonly ventasAutomationService: VentasAutomationService,
  ) {}

  // ==================== PIPELINE DE VENTAS ====================

  @Post('pipeline/convertir-cotizacion')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.UPDATE] })
  @ApiOperation({
    summary: 'Convertir cotización a orden de venta',
    description:
      'Convierte automáticamente una cotización aceptada en orden de venta',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversión exitosa',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        documentoOrigen: { type: 'object' },
        documentoDestino: { type: 'object' },
        mensaje: { type: 'string' },
      },
    },
  })
  async convertirCotizacionAOrden(
    @EmpresaId() empresaId: number,
    @Body() request: IConversionRequest,
  ) {
    return this.ventasPipelineService.convertirCotizacionAOrden({
      ...request,
      empresaId,
    });
  }

  @Post('pipeline/convertir-orden')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.ORDENES.UPDATE] })
  @ApiOperation({
    summary: 'Convertir orden de venta a factura',
    description: 'Convierte automáticamente una orden de venta en factura',
  })
  async convertirOrdenAFactura(
    @EmpresaId() empresaId: number,
    @Body() request: IConversionRequest,
  ) {
    return this.ventasPipelineService.convertirOrdenAFactura({
      ...request,
      empresaId,
    });
  }

  @Post('pipeline/proceso-completo/:cotizacionId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.UPDATE] })
  @ApiOperation({
    summary: 'Proceso completo de venta automatizado',
    description:
      'Ejecuta el flujo completo: cotización → orden → factura (opcional)',
  })
  @ApiParam({
    name: 'cotizacionId',
    description: 'ID de la cotización a procesar',
  })
  async procesoCompletoVenta(
    @EmpresaId() empresaId: number,
    @Param('cotizacionId', ParseIntPipe) cotizacionId: number,
    @Body()
    options: {
      notas?: string;
      fechaEntrega?: string;
      autofacturar?: boolean;
    },
  ) {
    const fechaEntrega = options.fechaEntrega
      ? new Date(options.fechaEntrega)
      : undefined;

    return this.ventasPipelineService.procesoCompletoVenta(
      cotizacionId,
      empresaId,
      {
        ...options,
        fechaEntrega,
      },
    );
  }

  @Get('pipeline/estadisticas')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Estadísticas del pipeline de ventas',
    description:
      'Obtiene métricas del embudo de conversión y rendimiento del pipeline',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    description: 'Fecha inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    description: 'Fecha fin (YYYY-MM-DD)',
  })
  async obtenerEstadisticasPipeline(
    @EmpresaId() empresaId: number,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const desde = fechaDesde ? new Date(fechaDesde) : undefined;
    const hasta = fechaHasta ? new Date(fechaHasta) : undefined;

    return this.ventasPipelineService.obtenerEstadisticasPipeline(
      empresaId,
      desde,
      hasta,
    );
  }

  @Get('pipeline/embudo-analisis')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Análisis del embudo de ventas',
    description:
      'Proporciona análisis detallado del funnel de conversión por etapas',
  })
  async analizarEmbudoVentas(
    @EmpresaId() empresaId: number,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const desde = fechaDesde ? new Date(fechaDesde) : undefined;
    const hasta = fechaHasta ? new Date(fechaHasta) : undefined;

    return this.ventasPipelineService.analizarEmbudoVentas(
      empresaId,
      desde,
      hasta,
    );
  }

  @Get('pipeline/cuellos-botella')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Identificar cuellos de botella',
    description:
      'Identifica problemas y cuellos de botella en el proceso de ventas',
  })
  async identificarCuellosBottella(@EmpresaId() empresaId: number) {
    return this.ventasPipelineService.identificarCuellosBottella(empresaId);
  }

  // ==================== ANALYTICS DE VENTAS ====================

  @Get('analytics/kpis')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'KPIs principales de ventas',
    description: 'Calcula indicadores clave de rendimiento de ventas',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: true,
    description: 'Fecha inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: true,
    description: 'Fecha fin (YYYY-MM-DD)',
  })
  async calcularKPIs(
    @EmpresaId() empresaId: number,
    @Query('fechaDesde') fechaDesde: string,
    @Query('fechaHasta') fechaHasta: string,
  ) {
    return this.ventasAnalyticsService.calcularKPIs(
      empresaId,
      new Date(fechaDesde),
      new Date(fechaHasta),
    );
  }

  @Get('analytics/dashboard')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Dashboard completo de ventas',
    description:
      'Genera un dashboard ejecutivo con todas las métricas de ventas',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        resumenGeneral: {
          type: 'object',
          properties: {
            ventasHoy: { type: 'number' },
            ventasSemana: { type: 'number' },
            ventasMes: { type: 'number' },
            ventasAño: { type: 'number' },
            objetivoMes: { type: 'number' },
            cumplimientoObjetivo: { type: 'number' },
          },
        },
        tendencias: { type: 'array' },
        alertas: { type: 'array' },
        oportunidades: { type: 'array' },
        metricas: { type: 'object' },
      },
    },
  })
  async generarDashboard(@EmpresaId() empresaId: number) {
    return this.ventasAnalyticsService.generarDashboard(empresaId);
  }

  @Get('analytics/predicciones')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Predicciones de ventas',
    description:
      'Genera predicciones de ventas basadas en datos históricos e IA',
  })
  @ApiQuery({
    name: 'meses',
    required: false,
    description: 'Número de meses a predecir (por defecto: 3)',
  })
  async predecirVentas(
    @EmpresaId() empresaId: number,
    @Query('meses') meses?: string,
  ) {
    const mesesAdelante = meses ? parseInt(meses) : 3;
    return this.ventasAnalyticsService.predecirVentas(empresaId, mesesAdelante);
  }

  @Get('analytics/estacionalidad')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Análisis de estacionalidad',
    description: 'Analiza patrones estacionales y temporales en las ventas',
  })
  async analizarEstacionalidad(@EmpresaId() empresaId: number) {
    return this.ventasAnalyticsService.analizarEstacionalidad(empresaId);
  }

  @Get('analytics/cohort-clientes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Análisis de cohort de clientes',
    description: 'Analiza retención y comportamiento de clientes por cohortes',
  })
  async analizarCohortClientes(@EmpresaId() empresaId: number) {
    return this.ventasAnalyticsService.analizarCohortClientes(empresaId);
  }

  // ==================== AUTOMATIZACIÓN DE VENTAS ====================

  @Post('automation/workflow/:cotizacionId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.UPDATE] })
  @ApiOperation({
    summary: 'Crear workflow de ventas',
    description: 'Crea un workflow automatizado para seguimiento de ventas',
  })
  @ApiParam({ name: 'cotizacionId', description: 'ID de la cotización' })
  async crearWorkflowVentas(
    @EmpresaId() empresaId: number,
    @Param('cotizacionId', ParseIntPipe) cotizacionId: number,
    @Body()
    body: {
      tipoWorkflow:
        | 'seguimiento_basico'
        | 'seguimiento_intensivo'
        | 'reactivacion_cliente'
        | 'venta_cruzada';
    },
  ) {
    return this.ventasAutomationService.crearWorkflowVentas(
      empresaId,
      cotizacionId,
      body.tipoWorkflow,
    );
  }

  @Post('automation/oportunidad/:cotizacionId')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.COTIZACIONES.READ] })
  @ApiOperation({
    summary: 'Gestionar oportunidad comercial',
    description:
      'Convierte una cotización en oportunidad comercial con seguimiento automático',
  })
  async gestionarOportunidadComercial(
    @EmpresaId() empresaId: number,
    @Param('cotizacionId', ParseIntPipe) cotizacionId: number,
    @Body()
    body: {
      probabilidad?: number;
      fechaEstimadaCierre?: string;
    },
  ) {
    const fechaCierre = body.fechaEstimadaCierre
      ? new Date(body.fechaEstimadaCierre)
      : undefined;

    return this.ventasAutomationService.gestionarOportunidadComercial(
      empresaId,
      cotizacionId,
      body.probabilidad,
      fechaCierre,
    );
  }

  @Get('automation/score-lead/:clienteId')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.READ] })
  @ApiOperation({
    summary: 'Calcular score de lead',
    description:
      'Calcula el puntaje automático de un cliente como lead comercial',
  })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Score calculado exitosamente',
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', description: 'Puntaje del 0 al 100' },
        factores: { type: 'array', items: { type: 'string' } },
        recomendaciones: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async calcularScoreLead(
    @EmpresaId() empresaId: number,
    @Param('clienteId', ParseIntPipe) clienteId: number,
  ) {
    return this.ventasAutomationService.calcularScoreLead(empresaId, clienteId);
  }

  @Post('automation/procesar-automatizaciones')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Procesar automatizaciones manualmente',
    description:
      'Ejecuta manualmente el procesamiento de automatizaciones (solo para administradores)',
  })
  async procesarAutomatizacionesManual() {
    return this.ventasAutomationService.procesarAutomatizaciones();
  }

  // ==================== REPORTES EJECUTIVOS ====================

  @Get('reportes/ejecutivo')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Reporte ejecutivo de ventas',
    description:
      'Genera un reporte ejecutivo completo con todas las métricas y análisis',
  })
  @ApiQuery({
    name: 'periodo',
    required: false,
    description: 'Periodo del reporte (mes|trimestre|año)',
    enum: ['mes', 'trimestre', 'año'],
  })
  async generarReporteEjecutivo(
    @EmpresaId() empresaId: number,
    @Query('periodo') periodo: 'mes' | 'trimestre' | 'año' = 'mes',
  ) {
    const hoy = new Date();
    let fechaDesde: Date;
    let fechaHasta: Date = hoy;

    switch (periodo) {
      case 'año':
        fechaDesde = new Date(hoy.getFullYear(), 0, 1);
        break;
      case 'trimestre':
        const trimestre = Math.floor(hoy.getMonth() / 3);
        fechaDesde = new Date(hoy.getFullYear(), trimestre * 3, 1);
        break;
      default: // mes
        fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }

    const [kpis, pipeline, dashboard, predicciones, cuellosBottella] =
      await Promise.all([
        this.ventasAnalyticsService.calcularKPIs(
          empresaId,
          fechaDesde,
          fechaHasta,
        ),
        this.ventasPipelineService.obtenerEstadisticasPipeline(
          empresaId,
          fechaDesde,
          fechaHasta,
        ),
        this.ventasAnalyticsService.generarDashboard(empresaId),
        this.ventasAnalyticsService.predecirVentas(empresaId, 3),
        this.ventasPipelineService.identificarCuellosBottella(empresaId),
      ]);

    return {
      periodo,
      fechaGeneracion: new Date(),
      fechaDesde,
      fechaHasta,
      resumenEjecutivo: {
        ventasTotales: kpis.ventasTotales,
        crecimiento: kpis.crecimientoMensual,
        conversion: pipeline.tasaConversionCotizacion,
        clientesActivos: kpis.clientesActivos,
      },
      kpis,
      pipeline,
      dashboard: dashboard.resumenGeneral,
      predicciones,
      alertas: cuellosBottella.alertas,
      recomendaciones: cuellosBottella.recomendaciones,
    };
  }
}
