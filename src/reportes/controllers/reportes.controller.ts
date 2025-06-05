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
  Inject,
  Logger,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ReportesRefactoredService } from '../services/reportes-refactored.service';
import { ReportesCalculationService } from '../services/reportes-calculation.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateReporteMejoradoDto,
  ReporteQueryMejoradoDto,
  ReporteVentasParamsDto,
  ReporteComprasParamsDto,
  ReporteInventarioParamsDto,
  ReporteClientesParamsDto,
  ReporteProductosParamsDto,
  ReporteFinancieroParamsDto,
} from '../dto/create-reporte-mejorado.dto';
import { ReporteParamsDto } from '../dto/reporte-params.dto';
import { TipoReporte } from '../dto/create-reporte.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('reportes')
@ApiExtraModels(
  CreateReporteMejoradoDto,
  ReporteQueryMejoradoDto,
  ReporteVentasParamsDto,
  ReporteComprasParamsDto,
  ReporteInventarioParamsDto,
  ReporteClientesParamsDto,
  ReporteProductosParamsDto,
  ReporteFinancieroParamsDto,
)
export class ReportesController {
  private readonly logger = new Logger(ReportesController.name);

  constructor(
    @Inject('REPORTES_SERVICE')
    private readonly reportesService: ReportesRefactoredService,
    private readonly reportesCalculationService: ReportesCalculationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.WRITE] })
  @ApiOperation({
    summary: 'Crear un nuevo reporte',
    description:
      'Crea un reporte con validaciones específicas para el contexto peruano y parámetros tipados por tipo de reporte',
  })
  @ApiResponse({
    status: 201,
    description: 'Reporte creado exitosamente con configuración peruana',
    schema: {
      type: 'object',
      properties: {
        id_reporte: { type: 'number', example: 1 },
        nombre: {
          type: 'string',
          example: 'Reporte de Ventas Mensual - Enero 2024',
        },
        tipo_reporte: { type: 'string', example: 'ventas' },
        formato: { type: 'string', example: 'pdf' },
        fecha_creacion: { type: 'string', format: 'date-time' },
        empresa: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Mi Empresa SAC' },
          },
        },
        usuario: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Juan Pérez' },
            email: { type: 'string', example: 'juan@empresa.com' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o validaciones fallidas',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para crear reportes en esta empresa',
  })
  async create(
    @Body() createReporteDto: CreateReporteMejoradoDto,
    @Request() req,
  ) {
    this.logger.log(
      `Creando reporte ${createReporteDto.tipo_reporte} para usuario ${req.user.id_usuario}`,
    );

    const reporte = await this.reportesService.create(
      createReporteDto,
      req.user.id_usuario,
    );

    this.logger.log(`Reporte ${reporte.id_reporte} creado exitosamente`);
    return {
      mensaje: 'Reporte creado exitosamente',
      reporte,
    };
  }

  @Get('ventas')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.VENTAS.READ] })
  @ApiOperation({
    summary: 'Generar reporte de ventas con métricas peruanas',
    description:
      'Genera reporte de ventas con cálculos de IGV 18%, formateo en soles peruanos y métricas específicas para el mercado peruano',
  })
  @ApiQuery({
    name: 'fecha_inicio',
    required: false,
    description: 'Fecha inicio (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: false,
    description: 'Fecha fin (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'agrupar_por',
    required: false,
    enum: ['dia', 'semana', 'mes', 'producto', 'cliente'],
    example: 'mes',
  })
  @ApiQuery({
    name: 'incluir_detalles',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'],
  })
  @ApiQuery({
    name: 'monto_minimo',
    required: false,
    type: Number,
    description: 'Monto mínimo en soles',
    example: 100,
  })
  @ApiQuery({
    name: 'monto_maximo',
    required: false,
    type: Number,
    description: 'Monto máximo en soles',
    example: 10000,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 1000)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de ventas generado con métricas peruanas',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        metadata: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
        metricas: {
          type: 'object',
          properties: {
            totalVentas: { type: 'string', example: 'S/ 125,450.00' },
            totalVentasSinIGV: { type: 'string', example: 'S/ 106,313.56' },
            igvTotal: { type: 'string', example: 'S/ 19,136.44' },
            cantidadOrdenes: { type: 'number', example: 45 },
            ticketPromedio: { type: 'string', example: 'S/ 2,787.78' },
            crecimientoVentas: { type: 'string', example: '15.5%' },
          },
        },
        configuracion: {
          type: 'object',
          properties: {
            moneda: { type: 'string', example: 'PEN' },
            zona_horaria: { type: 'string', example: 'America/Lima' },
            igv_rate: { type: 'number', example: 0.18 },
          },
        },
      },
    },
  })
  async getReporteVentas(
    @Query() params: ReporteVentasParamsDto,
    @Request() req,
  ) {
    this.logger.log(
      `Generando reporte de ventas para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.getReporteVentas(req.user.id_empresa, params);
  }

  @Get('compras')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.COMPRAS.READ] })
  @ApiOperation({
    summary: 'Generar reporte de compras con validaciones RUC',
    description:
      'Genera reporte de compras con validaciones de RUC peruano (11 dígitos) y cálculos de IGV',
  })
  @ApiQuery({
    name: 'fecha_inicio',
    required: false,
    description: 'Fecha inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: false,
    description: 'Fecha fin (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'agrupar_por',
    required: false,
    enum: ['dia', 'semana', 'mes', 'producto', 'proveedor'],
  })
  @ApiQuery({ name: 'incluir_detalles', required: false, type: Boolean })
  @ApiQuery({
    name: 'ruc_proveedor',
    required: false,
    description: 'RUC del proveedor (11 dígitos)',
    example: '20123456789',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 1000)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de compras generado con validaciones peruanas',
  })
  async getReporteCompras(
    @Query() params: ReporteComprasParamsDto,
    @Request() req,
  ) {
    this.logger.log(
      `Generando reporte de compras para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.getReporteCompras(req.user.id_empresa, params);
  }

  @Get('inventario')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.INVENTARIO.READ] })
  @ApiOperation({
    summary: 'Generar reporte de inventario con umbrales empresariales',
    description:
      'Genera reporte de inventario con umbrales de stock específicos para empresas peruanas y valorización en soles',
  })
  @ApiQuery({
    name: 'incluir_bajos',
    required: false,
    type: Boolean,
    description: 'Incluir productos con stock bajo',
  })
  @ApiQuery({
    name: 'umbral_minimo',
    required: false,
    type: Number,
    description: 'Umbral mínimo de stock (0-10,000)',
    example: 10,
  })
  @ApiQuery({
    name: 'agrupar_por',
    required: false,
    enum: ['categoria', 'subcategoria', 'proveedor'],
  })
  @ApiQuery({ name: 'incluir_movimientos', required: false, type: Boolean })
  @ApiQuery({
    name: 'valor_minimo',
    required: false,
    type: Number,
    description: 'Valor mínimo en soles',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 1000)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de inventario generado con métricas peruanas',
  })
  async getReporteInventario(
    @Query() params: ReporteInventarioParamsDto,
    @Request() req,
  ) {
    this.logger.log(
      `Generando reporte de inventario para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.getReporteInventario(
      req.user.id_empresa,
      params,
    );
  }

  @Get('productos')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.PRODUCTOS.READ] })
  @ApiOperation({
    summary: 'Generar reporte de productos con análisis de rendimiento',
    description:
      'Genera reporte de productos con análisis de rendimiento, rotación y valoraciones',
  })
  @ApiQuery({
    name: 'categoria_id',
    required: false,
    type: Number,
    description: 'ID de categoría para filtrar',
  })
  @ApiQuery({
    name: 'subcategoria_id',
    required: false,
    type: Number,
    description: 'ID de subcategoría para filtrar',
  })
  @ApiQuery({ name: 'incluir_stock', required: false, type: Boolean })
  @ApiQuery({ name: 'incluir_ventas', required: false, type: Boolean })
  @ApiQuery({ name: 'incluir_valoraciones', required: false, type: Boolean })
  @ApiQuery({ name: 'solo_activos', required: false, type: Boolean })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 1000)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de productos generado con análisis de rendimiento',
  })
  async getReporteProductos(
    @Query() params: ReporteProductosParamsDto,
    @Request() req,
  ) {
    this.logger.log(
      `Generando reporte de productos para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.getReporteProductos(
      req.user.id_empresa,
      params as ReporteParamsDto,
    );
  }

  @Get('clientes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.CLIENTES.READ] })
  @ApiOperation({
    summary: 'Generar reporte de clientes con segmentación peruana',
    description:
      'Genera reporte de clientes con segmentación por tipo (individual/corporativo) y métricas de retención',
  })
  @ApiQuery({
    name: 'fecha_inicio',
    required: false,
    description: 'Fecha inicio para filtrar actividad',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: false,
    description: 'Fecha fin para filtrar actividad',
  })
  @ApiQuery({
    name: 'tipo_cliente',
    required: false,
    enum: ['individual', 'corporativo', 'todos'],
  })
  @ApiQuery({ name: 'incluir_compras', required: false, type: Boolean })
  @ApiQuery({ name: 'incluir_valoraciones', required: false, type: Boolean })
  @ApiQuery({
    name: 'monto_minimo_compras',
    required: false,
    type: Number,
    description: 'Monto mínimo de compras en soles',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 1000)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de clientes generado con segmentación peruana',
  })
  async getReporteClientes(
    @Query() params: ReporteClientesParamsDto,
    @Request() req,
  ) {
    this.logger.log(
      `Generando reporte de clientes para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.getReporteClientes(req.user.id_empresa, params);
  }

  @Get('financiero')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.FINANCIERO.READ] })
  @ApiOperation({
    summary: 'Generar reporte financiero con indicadores peruanos',
    description:
      'Genera reporte financiero con indicadores específicos para empresas peruanas, incluyendo IGV y flujo de efectivo',
  })
  @ApiQuery({
    name: 'fecha_inicio',
    required: false,
    description: 'Fecha inicio del período financiero',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: false,
    description: 'Fecha fin del período financiero',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['ventas', 'compras', 'general'],
  })
  @ApiQuery({
    name: 'incluir_impuestos',
    required: false,
    type: Boolean,
    description: 'Incluir desglose de IGV',
  })
  @ApiQuery({ name: 'incluir_detalles', required: false, type: Boolean })
  @ApiQuery({ name: 'incluir_proyecciones', required: false, type: Boolean })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 1000)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte financiero generado con indicadores peruanos',
  })
  async getReporteFinanciero(
    @Query() params: ReporteFinancieroParamsDto,
    @Request() req,
  ) {
    this.logger.log(
      `Generando reporte financiero para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.getReporteFinanciero(
      req.user.id_empresa,
      params,
    );
  }

  @Get('historial')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.READ] })
  @ApiOperation({
    summary: 'Obtener historial de reportes con paginación',
    description:
      'Obtiene el historial de reportes generados con información de ejecuciones y paginación',
  })
  @ApiQuery({
    name: 'tipo_reporte',
    required: false,
    enum: Object.values(TipoReporte),
    description: 'Filtrar por tipo de reporte',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (máx 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de reportes con paginación',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id_reporte: { type: 'number' },
              nombre: { type: 'string' },
              tipo_reporte: { type: 'string' },
              fecha_creacion: { type: 'string', format: 'date-time' },
              ultima_ejecucion: { type: 'string', format: 'date-time' },
              usuario: { type: 'object' },
              ejecuciones: { type: 'array' },
            },
          },
        },
        metadata: { type: 'object' },
      },
    },
  })
  async getHistorial(@Query() query: ReporteQueryMejoradoDto, @Request() req) {
    this.logger.log(
      `Obteniendo historial de reportes para empresa ${req.user.id_empresa}`,
    );

    const { page = 1, limit = 20, ...filters } = query;

    return this.reportesService.getReportesHistory(
      req.user.id_empresa,
      filters.formato,
      page,
      Math.min(limit, 100), // Límite máximo de 100
    );
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.READ] })
  @ApiOperation({
    summary: 'Obtener todos los reportes de la empresa',
    description:
      'Obtiene la lista de todos los reportes configurados para la empresa con información resumida',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reportes de la empresa',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id_reporte: { type: 'number' },
          nombre: { type: 'string' },
          tipo_reporte: { type: 'string' },
          formato: { type: 'string' },
          activo: { type: 'boolean' },
          fecha_creacion: { type: 'string', format: 'date-time' },
          ultima_ejecucion: { type: 'string', format: 'date-time' },
          empresa: { type: 'object' },
          usuario: { type: 'object' },
          ejecuciones: { type: 'array' },
        },
      },
    },
  })
  async findAll(@Request() req) {
    this.logger.log(
      `Obteniendo todos los reportes para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.findAll(req.user.id_empresa);
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.REPORTES.READ] })
  @ApiOperation({
    summary: 'Obtener detalles de un reporte específico',
    description:
      'Obtiene los detalles completos de un reporte incluyendo historial de ejecuciones',
  })
  @ApiParam({ name: 'id', description: 'ID del reporte', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Detalles del reporte',
    schema: {
      type: 'object',
      properties: {
        id_reporte: { type: 'number' },
        nombre: { type: 'string' },
        descripcion: { type: 'string' },
        tipo_reporte: { type: 'string' },
        parametros: { type: 'object' },
        formato: { type: 'string' },
        activo: { type: 'boolean' },
        fecha_creacion: { type: 'string', format: 'date-time' },
        ultima_ejecucion: { type: 'string', format: 'date-time' },
        empresa: { type: 'object' },
        usuario: { type: 'object' },
        ejecuciones: { type: 'array' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(
      `Obteniendo detalles del reporte ${id} para empresa ${req.user.id_empresa}`,
    );
    return this.reportesService.findOne(id, req.user.id_empresa);
  }

  @Post(':id/ejecutar')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({
    permissions: [
      PERMISSIONS.REPORTES.VENTAS.EXPORT,
      PERMISSIONS.REPORTES.PRODUCTOS.EXPORT,
      PERMISSIONS.REPORTES.CLIENTES.EXPORT,
      PERMISSIONS.REPORTES.FINANCIERO.EXPORT,
    ],
  })
  @ApiOperation({
    summary: 'Ejecutar un reporte programado',
    description:
      'Ejecuta un reporte previamente configurado usando el Template Method Pattern para garantizar consistencia',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del reporte a ejecutar',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte ejecutado exitosamente',
    schema: {
      type: 'object',
      properties: {
        mensaje: { type: 'string', example: 'Reporte ejecutado exitosamente' },
        resultado: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            metadata: { type: 'object' },
            metricas: { type: 'object' },
            configuracion: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para ejecutar este tipo de reporte',
  })
  async ejecutarReporte(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(
      `Ejecutando reporte ${id} para empresa ${req.user.id_empresa}`,
    );

    const resultado = await this.reportesService.ejecutarReporte(
      id,
      req.user.id_empresa,
      req.user.id_usuario,
    );

    this.logger.log(`Reporte ${id} ejecutado exitosamente`);
    return resultado;
  }

  /**
   * Endpoint para generar reporte de WhatsApp
   * GET /reportes/whatsapp/{empresaId}
   */
  @Get('whatsapp/:empresaId')
  @ApiOperation({
    summary: 'Generar reporte de WhatsApp',
    description:
      'Genera un reporte detallado de las métricas y actividad de WhatsApp para una empresa específica, incluyendo mensajes, conversaciones, instancias y alertas.',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'fechaInicio',
    description: 'Fecha de inicio del período (formato: YYYY-MM-DD)',
    required: false,
    type: 'string',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'fechaFin',
    description: 'Fecha de fin del período (formato: YYYY-MM-DD)',
    required: false,
    type: 'string',
    example: '2024-01-31',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página para paginación',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Cantidad de registros por página',
    required: false,
    type: 'number',
    example: 100,
  })
  @ApiQuery({
    name: 'agruparPor',
    description: 'Tipo de agrupación para métricas temporales',
    required: false,
    enum: ['hora', 'dia', 'semana', 'mes'],
    example: 'dia',
  })
  @ApiQuery({
    name: 'instanciaId',
    description: 'ID de instancia específica para filtrar',
    required: false,
    type: 'string',
    example: 'inst_empresa1_whatsapp',
  })
  @ApiQuery({
    name: 'incluirAlertas',
    description: 'Incluir alertas en el reporte',
    required: false,
    type: 'boolean',
    example: true,
  })
  @ApiQuery({
    name: 'formatoSalida',
    description: 'Formato de salida del reporte',
    required: false,
    enum: ['JSON', 'CSV', 'PDF'],
    example: 'JSON',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de WhatsApp generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Lista de eventos y actividades de WhatsApp',
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', example: 'NOTIFICACION' },
              id: { type: 'number', example: 123 },
              fecha: { type: 'string', format: 'date-time' },
              contenido: {
                type: 'string',
                example: 'Nuevo mensaje de +51987654321',
              },
              estado: { type: 'string', example: 'PENDIENTE' },
              usuario: { type: 'string', example: 'Juan Pérez' },
              instancia: { type: 'string', example: 'inst_empresa1_whatsapp' },
              prioridad: { type: 'string', example: 'MEDIA' },
              fecha_formateada: { type: 'string', example: '25/12/2024 15:30' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 245 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 3 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
        metricas: {
          type: 'object',
          properties: {
            totalMensajes: { type: 'number', example: 1247 },
            mensajesEnviados: { type: 'number', example: 623 },
            mensajesRecibidos: { type: 'number', example: 624 },
            totalConversaciones: { type: 'number', example: 89 },
            conversacionesActivas: { type: 'number', example: 62 },
            totalInstancias: { type: 'number', example: 3 },
            instanciasConectadas: { type: 'number', example: 2 },
            tiempoRespuestaPromedio: { type: 'number', example: 12 },
            tasaRespuesta: { type: 'number', example: 94 },
            topConversaciones: { type: 'array', items: { type: 'object' } },
            topInstancias: { type: 'array', items: { type: 'object' } },
            alertasWhatsapp: { type: 'array', items: { type: 'object' } },
          },
        },
        configuracion: {
          type: 'object',
          properties: {
            moneda: { type: 'string', example: 'PEN' },
            zona_horaria: { type: 'string', example: 'America/Lima' },
            formato_fecha: { type: 'string', example: 'dd/MM/yyyy' },
            igv_rate: { type: 'number', example: 0.18 },
          },
        },
        fecha_generacion: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'El parámetro agrupar_por debe ser: hora, dia, semana o mes',
        },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Empresa no encontrada' },
        error: { type: 'string', example: 'Not Found' },
        statusCode: { type: 'number', example: 404 },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Error al generar reporte de WhatsApp',
        },
        error: { type: 'string', example: 'Internal Server Error' },
        statusCode: { type: 'number', example: 500 },
      },
    },
  })
  async getReporteWhatsapp(
    @Param('empresaId') empresaId: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('agruparPor') agruparPor?: 'hora' | 'dia' | 'semana' | 'mes',
    @Query('instanciaId') instanciaId?: string,
    @Query('incluirAlertas') incluirAlertas?: string,
    @Query('formatoSalida') formatoSalida?: 'JSON' | 'CSV' | 'PDF',
  ) {
    try {
      // Validar empresa ID
      const empresaIdNum = parseInt(empresaId, 10);
      if (isNaN(empresaIdNum)) {
        throw new BadRequestException(
          'ID de empresa debe ser un número válido',
        );
      }

      // Validar y convertir fechas
      let fechaInicioDate: Date | undefined;
      let fechaFinDate: Date | undefined;

      if (fechaInicio) {
        fechaInicioDate = new Date(fechaInicio);
        if (isNaN(fechaInicioDate.getTime())) {
          throw new BadRequestException(
            'Fecha de inicio inválida. Use formato YYYY-MM-DD',
          );
        }
      }

      if (fechaFin) {
        fechaFinDate = new Date(fechaFin);
        if (isNaN(fechaFinDate.getTime())) {
          throw new BadRequestException(
            'Fecha de fin inválida. Use formato YYYY-MM-DD',
          );
        }
      }

      // Validar que fechaInicio <= fechaFin
      if (fechaInicioDate && fechaFinDate && fechaInicioDate > fechaFinDate) {
        throw new BadRequestException(
          'La fecha de inicio no puede ser mayor que la fecha de fin',
        );
      }

      // Validar paginación
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 100;

      if (pageNum < 1) {
        throw new BadRequestException('El número de página debe ser mayor a 0');
      }

      if (limitNum < 1 || limitNum > 1000) {
        throw new BadRequestException('El límite debe estar entre 1 y 1000');
      }

      // Validar que la empresa existe
      const empresa = await this.prisma.empresa.findUnique({
        where: { id_empresa: empresaIdNum },
        select: { id_empresa: true, nombre: true },
      });

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }

      // Construir parámetros
      const parametros = {
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate,
        page: pageNum,
        limit: limitNum,
        agruparPor: agruparPor || 'dia',
        instanciaId,
        incluirAlertas: incluirAlertas === 'true' || incluirAlertas === '1',
        formatoSalida: formatoSalida || 'JSON',
      };

      // Generar reporte usando el servicio base
      const resultado =
        await this.reportesCalculationService.calculateMetricasWhatsapp(
          empresaIdNum,
          parametros.fechaInicio,
          parametros.fechaFin,
          parametros,
        );

      // Formatear respuesta
      const respuesta = {
        data: [],
        metadata: {
          total: 0,
          page: parametros.page,
          limit: parametros.limit,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        metricas: resultado,
        configuracion: {
          moneda: 'PEN',
          zona_horaria: 'America/Lima',
          formato_fecha: 'dd/MM/yyyy',
          igv_rate: 0.18,
        },
        fecha_generacion: new Date(),
      };

      // Log de actividad
      this.logger.log(
        `Reporte de WhatsApp generado para empresa ${empresaIdNum}: ${resultado.totalMensajes || 0} mensajes`,
      );

      return resultado;
    } catch (error) {
      this.logger.error(
        `Error en endpoint de reporte WhatsApp: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno al generar reporte de WhatsApp',
      );
    }
  }

  /**
   * Endpoint para obtener métricas rápidas de WhatsApp (sin paginación)
   * GET /reportes/whatsapp/{empresaId}/metricas
   */
  @Get('whatsapp/:empresaId/metricas')
  @ApiOperation({
    summary: 'Obtener métricas rápidas de WhatsApp',
    description:
      'Obtiene únicamente las métricas calculadas de WhatsApp sin los datos detallados, útil para dashboards y resúmenes.',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'periodo',
    description: 'Período predefinido para las métricas',
    required: false,
    enum: ['hoy', 'ayer', '7dias', '30dias', '90dias'],
    example: '30dias',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de WhatsApp obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalMensajes: { type: 'number', example: 1247 },
        mensajesEnviados: { type: 'number', example: 623 },
        mensajesRecibidos: { type: 'number', example: 624 },
        totalConversaciones: { type: 'number', example: 89 },
        conversacionesActivas: { type: 'number', example: 62 },
        totalInstancias: { type: 'number', example: 3 },
        instanciasConectadas: { type: 'number', example: 2 },
        tiempoRespuestaPromedio: { type: 'number', example: 12 },
        tasaRespuesta: { type: 'number', example: 94 },
        alertasActivas: { type: 'number', example: 2 },
        fecha_calculo: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getMetricasWhatsapp(
    @Param('empresaId') empresaId: string,
    @Query('periodo') periodo?: 'hoy' | 'ayer' | '7dias' | '30dias' | '90dias',
  ) {
    try {
      // Validar empresa ID
      const empresaIdNum = parseInt(empresaId, 10);
      if (isNaN(empresaIdNum)) {
        throw new BadRequestException(
          'ID de empresa debe ser un número válido',
        );
      }

      // Determinar fechas según el período
      const now = new Date();
      let fechaInicio: Date;
      let fechaFin: Date = now;

      switch (periodo) {
        case 'hoy':
          fechaInicio = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case 'ayer':
          fechaInicio = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1,
          );
          fechaFin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7dias':
          fechaInicio = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90dias':
          fechaInicio = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '30dias':
        default:
          fechaInicio = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Calcular solo métricas
      const metricas =
        await this.reportesCalculationService.calculateMetricasWhatsapp(
          empresaIdNum,
          fechaInicio,
          fechaFin,
          { periodo },
        );

      // Enriquecer con datos adicionales
      const resultado = {
        ...metricas,
        alertasActivas:
          metricas.alertasWhatsapp?.filter((a: any) => a.estado === 'ACTIVA')
            .length || 0,
        fecha_calculo: new Date(),
        periodo_consultado: periodo || '30dias',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      };

      this.logger.log(
        `Métricas WhatsApp calculadas para empresa ${empresaIdNum}: ${metricas.totalMensajes} mensajes`,
      );

      return resultado;
    } catch (error) {
      this.logger.error(
        `Error obteniendo métricas WhatsApp: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno al calcular métricas de WhatsApp',
      );
    }
  }
}
