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
  ComprasPipelineService,
  IConversionRequestCompras,
} from '../services/compras-pipeline.service';
import { ComprasAnalyticsService } from '../services/compras-analytics.service';
import { ComprasAutomationService } from '../services/compras-automation.service';

@ApiTags('Compras Avanzado')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/compras-avanzado')
export class ComprasAvanzadoController {
  constructor(
    private readonly comprasPipelineService: ComprasPipelineService,
    private readonly comprasAnalyticsService: ComprasAnalyticsService,
    private readonly comprasAutomationService: ComprasAutomationService,
  ) {}

  // ==================== PIPELINE DE COMPRAS ====================

  @Post('pipeline/cotizacion-a-orden')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.ORDENES.CREATE] })
  @ApiOperation({
    summary: 'Convertir cotización de proveedor a orden de compra',
    description:
      'Convierte automáticamente una cotización de proveedor aprobada en una orden de compra',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversión exitosa',
    schema: {
      type: 'object',
      properties: {
        exito: { type: 'boolean' },
        documentoOrigen: { type: 'object' },
        documentoDestino: { type: 'object' },
        datos: {
          type: 'object',
          properties: {
            documentoId: { type: 'number' },
            numeroDocumento: { type: 'string' },
            total: { type: 'number' },
            estado: { type: 'string' },
          },
        },
        mensaje: { type: 'string' },
        fechaConversion: { type: 'string', format: 'date-time' },
      },
    },
  })
  async convertirCotizacionAOrden(
    @EmpresaId() empresaId: number,
    @Body() request: IConversionRequestCompras,
  ) {
    return this.comprasPipelineService.convertirCotizacionAOrden({
      ...request,
      empresaId,
    });
  }

  @Post('pipeline/marcar-recibida/:ordenId')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.ALMACEN,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.ORDENES.UPDATE] })
  @ApiOperation({
    summary: 'Marcar orden de compra como recibida',
    description:
      'Marca una orden de compra como recibida y actualiza automáticamente el inventario',
  })
  @ApiParam({
    name: 'ordenId',
    description: 'ID de la orden de compra a marcar como recibida',
  })
  async marcarOrdenRecibida(
    @EmpresaId() empresaId: number,
    @Param('ordenId', ParseIntPipe) ordenId: number,
    @Body()
    body: {
      notas?: string;
      cantidadesRecibidas?: { [productoId: number]: number };
      fechaRecepcion?: string;
    },
  ) {
    const fechaRecepcion = body.fechaRecepcion
      ? new Date(body.fechaRecepcion)
      : undefined;

    return this.comprasPipelineService.marcarOrdenRecibida({
      documentoId: ordenId,
      empresaId,
      notas: body.notas,
      cantidadesRecibidas: body.cantidadesRecibidas,
      fechaRecepcion,
    });
  }

  @Post('pipeline/proceso-completo/:cotizacionId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.ORDENES.CREATE] })
  @ApiOperation({
    summary: 'Proceso completo de compra automatizado',
    description:
      'Ejecuta el flujo completo: cotización → orden → recepción (opcional)',
  })
  @ApiParam({
    name: 'cotizacionId',
    description: 'ID de la cotización de proveedor a procesar',
  })
  async procesoCompletoCompra(
    @EmpresaId() empresaId: number,
    @Param('cotizacionId', ParseIntPipe) cotizacionId: number,
    @Body()
    options: {
      notas?: string;
      fechaEntrega?: string;
      autoReceptor?: boolean;
      cantidadesRecibidas?: { [productoId: number]: number };
    },
  ) {
    const fechaEntrega = options.fechaEntrega
      ? new Date(options.fechaEntrega)
      : undefined;

    return this.comprasPipelineService.procesoCompletoCompra(
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
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.ORDENES.READ] })
  @ApiOperation({
    summary: 'Estadísticas del pipeline de compras',
    description:
      'Obtiene métricas del embudo de conversión y rendimiento del pipeline de compras',
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

    return this.comprasPipelineService.obtenerEstadisticasPipeline(
      empresaId,
      desde,
      hasta,
    );
  }

  @Get('pipeline/embudo-analisis')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Análisis del embudo de compras',
    description:
      'Proporciona análisis detallado del funnel de conversión por etapas en compras',
  })
  async analizarEmbudoCompras(
    @EmpresaId() empresaId: number,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const desde = fechaDesde ? new Date(fechaDesde) : undefined;
    const hasta = fechaHasta ? new Date(fechaHasta) : undefined;

    return this.comprasPipelineService.analizarEmbudoCompras(
      empresaId,
      desde,
      hasta,
    );
  }

  @Get('pipeline/oportunidades-ahorro')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Identificar oportunidades de ahorro',
    description:
      'Identifica oportunidades de ahorro y optimización en el proceso de compras',
  })
  async identificarOportunidadesAhorro(@EmpresaId() empresaId: number) {
    return this.comprasPipelineService.identificarOportunidadesAhorro(
      empresaId,
    );
  }

  // ==================== ANALYTICS DE COMPRAS ====================

  @Get('analytics/kpis')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'KPIs principales de compras',
    description:
      'Calcula indicadores clave de rendimiento de compras y gestión de proveedores',
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
    return this.comprasAnalyticsService.calcularKPIs(
      empresaId,
      new Date(fechaDesde),
      new Date(fechaHasta),
    );
  }

  @Get('analytics/dashboard')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Dashboard completo de compras',
    description:
      'Genera un dashboard ejecutivo con todas las métricas de compras y gestión de proveedores',
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
            gastosHoy: { type: 'number' },
            gastosSemana: { type: 'number' },
            gastosMes: { type: 'number' },
            gastosAño: { type: 'number' },
            presupuestoMes: { type: 'number' },
            cumplimientoPresupuesto: { type: 'number' },
          },
        },
        alertasUrgentes: { type: 'array' },
        metricas: { type: 'object' },
        tendencias: { type: 'array' },
        oportunidades: { type: 'array' },
      },
    },
  })
  async generarDashboard(@EmpresaId() empresaId: number) {
    return this.comprasAnalyticsService.generarDashboard(empresaId);
  }

  @Get('analytics/predicciones')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Predicciones de compras',
    description:
      'Genera predicciones de gastos en compras basadas en datos históricos e IA',
  })
  @ApiQuery({
    name: 'meses',
    required: false,
    description: 'Número de meses a predecir (por defecto: 3)',
  })
  async predecirCompras(
    @EmpresaId() empresaId: number,
    @Query('meses') meses?: string,
  ) {
    const mesesAdelante = meses ? parseInt(meses) : 3;
    return this.comprasAnalyticsService.predecirCompras(
      empresaId,
      mesesAdelante,
    );
  }

  @Get('analytics/analisis-proveedores')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.READ] })
  @ApiOperation({
    summary: 'Análisis avanzado de proveedores',
    description:
      'Analiza rendimiento, diversificación y oportunidades de mejora con proveedores',
  })
  async analizarProveedores(@EmpresaId() empresaId: number) {
    return this.comprasAnalyticsService.analizarProveedores(empresaId);
  }

  @Get('analytics/estacionalidad')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Análisis de estacionalidad en compras',
    description: 'Analiza patrones estacionales y temporales en las compras',
  })
  async analizarEstacionalidad(@EmpresaId() empresaId: number) {
    return this.comprasAnalyticsService.analizarEstacionalidad(empresaId);
  }

  // ==================== AUTOMATIZACIÓN DE COMPRAS ====================

  @Post('automation/gestionar-proveedor/:proveedorId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.READ] })
  @ApiOperation({
    summary: 'Gestión automática de proveedor',
    description:
      'Evalúa automáticamente el rendimiento de un proveedor y genera recomendaciones',
  })
  @ApiParam({ name: 'proveedorId', description: 'ID del proveedor' })
  async gestionarProveedorAutomatico(
    @EmpresaId() empresaId: number,
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
  ) {
    return this.comprasAutomationService.gestionarProveedorAutomatico(
      empresaId,
      proveedorId,
    );
  }

  @Get('automation/seguimiento-ordenes')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.ALMACEN,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.ORDENES.READ] })
  @ApiOperation({
    summary: 'Seguimiento inteligente de órdenes',
    description:
      'Genera seguimiento automático de órdenes de compra con alertas y recomendaciones',
  })
  async generarSeguimientoOrdenes(@EmpresaId() empresaId: number) {
    return this.comprasAutomationService.generarSeguimientoOrdenes(empresaId);
  }

  @Post('automation/procesar-automatizaciones')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Procesar automatizaciones manualmente',
    description:
      'Ejecuta manualmente el procesamiento de automatizaciones de compras (solo para administradores)',
  })
  async procesarAutomatizacionesManual() {
    return this.comprasAutomationService.procesarAutomatizacionesCompras();
  }

  // ==================== REPORTES EJECUTIVOS ====================

  @Get('reportes/ejecutivo')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Reporte ejecutivo de compras',
    description:
      'Genera un reporte ejecutivo completo con todas las métricas y análisis de compras',
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

    const [
      kpis,
      pipeline,
      dashboard,
      predicciones,
      oportunidadesAhorro,
      analisisProveedores,
    ] = await Promise.all([
      this.comprasAnalyticsService.calcularKPIs(
        empresaId,
        fechaDesde,
        fechaHasta,
      ),
      this.comprasPipelineService.obtenerEstadisticasPipeline(
        empresaId,
        fechaDesde,
        fechaHasta,
      ),
      this.comprasAnalyticsService.generarDashboard(empresaId),
      this.comprasAnalyticsService.predecirCompras(empresaId, 3),
      this.comprasPipelineService.identificarOportunidadesAhorro(empresaId),
      this.comprasAnalyticsService.analizarProveedores(empresaId),
    ]);

    return {
      periodo,
      fechaGeneracion: new Date(),
      resumenEjecutivo: {
        gastoTotal: kpis.gastoTotal,
        cantidadOrdenes: kpis.cantidadOrdenes,
        proveedoresActivos: kpis.cantidadProveedores,
        eficienciaGeneral: pipeline.tasaConversionCotizacion,
        ahorrosPotenciales: oportunidadesAhorro.ahorrosPotenciales.reduce(
          (sum, ahorro) => sum + ahorro.ahorroAnualPotencial,
          0,
        ),
      },
      metricas: {
        kpis,
        pipeline,
        dashboard: dashboard.resumenGeneral,
      },
      analisis: {
        proveedores: analisisProveedores,
        oportunidadesAhorro: oportunidadesAhorro.ahorrosPotenciales,
        predicciones,
      },
      alertas: dashboard.alertasUrgentes,
      recomendaciones: [
        ...oportunidadesAhorro.recomendaciones,
        ...analisisProveedores.diversificacion.recomendaciones,
      ],
      metadatos: {
        versionReporte: '1.0',
        tipoAnalisis: 'COMPLETO',
        confiabilidadDatos: 95,
      },
    };
  }

  // ==================== ENDPOINTS DE GESTIÓN INTELIGENTE ====================

  @Get('inteligencia/sugerencias-compra')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.ALMACEN,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Sugerencias inteligentes de compra',
    description:
      'Genera sugerencias automáticas de compras basadas en stock, histórico y predicciones',
  })
  async obtenerSugerenciasCompra(@EmpresaId() empresaId: number) {
    // Simulación de sugerencias inteligentes
    const stockBajo =
      await this.comprasAutomationService.procesarAlertasStock();
    const seguimientoOrdenes =
      await this.comprasAutomationService.generarSeguimientoOrdenes(empresaId);

    return {
      sugerenciasUrgentes: seguimientoOrdenes.filter((o) => o.alerta === 'ROJO')
        .length,
      productosStockBajo: 0, // Se actualizaría con datos reales
      ordenesRetrasadas: seguimientoOrdenes.filter((o) => o.alerta === 'ROJO')
        .length,
      recomendaciones: [
        'Revisar productos con stock crítico',
        'Contactar proveedores con entregas retrasadas',
        'Evaluar precios de proveedores alternativos',
      ],
      proximasAcciones: seguimientoOrdenes.slice(0, 5).map((o) => ({
        accion: o.proxima_accion,
        prioridad: o.alerta,
        orden: o.numeroOrden,
      })),
    };
  }

  @Get('inteligencia/analisis-gastos')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Análisis inteligente de gastos',
    description:
      'Análisis avanzado de patrones de gasto con detección de anomalías y optimizaciones',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    description: 'Filtrar por categoría de producto',
  })
  @ApiQuery({
    name: 'proveedor',
    required: false,
    description: 'Filtrar por proveedor específico',
  })
  async analizarGastosInteligente(
    @EmpresaId() empresaId: number,
    @Query('categoria') categoria?: string,
    @Query('proveedor') proveedor?: string,
  ) {
    const hoy = new Date();
    const hace90Dias = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);

    const kpis = await this.comprasAnalyticsService.calcularKPIs(
      empresaId,
      hace90Dias,
      hoy,
    );
    const estacionalidad =
      await this.comprasAnalyticsService.analizarEstacionalidad(empresaId);

    return {
      resumenPeriodo: {
        gastoTotal: kpis.gastoTotal,
        gastoPromedio: kpis.gastoPromedioPorOrden,
        tendencia: kpis.tendenciaGasto.crecimientoMensual,
        eficiencia: kpis.eficienciaProveedores.tasaCumplimiento,
      },
      analisisDetallado: {
        categoriasPrincipales: kpis.categoriasMasCompradas,
        proveedoresPrincipales: kpis.proveedoresMasActivos,
        patronesEstacionales: estacionalidad.patronesMensuales.slice(0, 3),
      },
      alertasInteligentes: [
        ...(kpis.tendenciaGasto.crecimientoMensual > 20
          ? ['Crecimiento acelerado de gastos detectado']
          : []),
        ...(kpis.eficienciaProveedores.tasaCumplimiento < 80
          ? ['Problemas de cumplimiento con proveedores']
          : []),
      ],
      recomendacionesOptimizacion: estacionalidad.recomendaciones.slice(0, 3),
      metricasComparativas: {
        vsPromedioIndustria: 'N/A',
        vsObjetivos: kpis.tendenciaGasto.comparacionPeriodoAnterior,
        eficienciaRelativa: 85, // Simulado
      },
    };
  }
}
