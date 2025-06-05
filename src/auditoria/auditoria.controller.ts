import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuditoriaService } from './services/auditoria.service';
import {
  CreateAuditoriaDto,
  AuditoriaFiltersDto,
  PaginationDto,
  TipoAccion,
  TipoRecurso,
  NivelSeveridad,
} from './dto';
import {
  AuditoriaFormatted,
  PaginatedAuditoriaResponse,
  AuditoriaStats,
  AuditoriaContext,
  AuditoriaExportOptions,
} from './interfaces/auditoria.interface';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Controlador de Auditoría
 * Maneja todas las operaciones relacionadas con el registro y consulta de eventos de auditoría
 * Principios SOLID aplicados:
 * - Single Responsibility: Manejo de endpoints de auditoría
 * - Open/Closed: Extensible mediante decoradores y guards
 * - Dependency Inversion: Depende de abstracciones (AuditoriaService)
 */
@ApiTags('Auditoría')
@Controller('auditoria')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Registrar un nuevo evento de auditoría
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  // @Roles('admin', 'auditor', 'usuario')
  @ApiOperation({
    summary: 'Registrar evento de auditoría',
    description: 'Registra un nuevo evento en el sistema de auditoría',
  })
  @ApiBody({
    type: CreateAuditoriaDto,
    description: 'Datos del evento de auditoría',
  })
  @ApiResponse({
    status: 201,
    description: 'Evento registrado exitosamente',
    type: 'AuditoriaFormatted',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  // @UsePipes(new ValidationPipe({ transform: true }))
  async registrarEvento(
    @Body() createAuditoriaDto: CreateAuditoriaDto,
    @Request() req: any,
  ): Promise<AuditoriaFormatted> {
    const context = {
      empresa_id: req.user.empresa_id,
      usuario_id: req.user.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        endpoint: '/auditoria',
        method: 'POST',
      },
    };

    return await this.auditoriaService.registrarEvento(
      createAuditoriaDto,
      context,
    );
  }

  /**
   * Obtener eventos de auditoría con filtros y paginación
   */
  @Get()
  // @Roles('admin', 'auditor')
  @ApiOperation({
    summary: 'Listar eventos de auditoría',
    description:
      'Obtiene una lista paginada de eventos de auditoría con filtros opcionales',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (por defecto: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página (por defecto: 10, máximo: 100)',
  })
  @ApiQuery({
    name: 'accion',
    required: false,
    enum: TipoAccion,
    description: 'Filtrar por tipo de acción',
  })
  @ApiQuery({
    name: 'recurso',
    required: false,
    enum: TipoRecurso,
    description: 'Filtrar por tipo de recurso',
  })
  @ApiQuery({
    name: 'severidad',
    required: false,
    enum: NivelSeveridad,
    description: 'Filtrar por nivel de severidad',
  })
  @ApiQuery({
    name: 'usuario_id',
    required: false,
    type: String,
    description: 'Filtrar por ID de usuario',
  })
  @ApiQuery({
    name: 'fecha_inicio',
    required: false,
    type: String,
    description: 'Fecha de inicio (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: false,
    type: String,
    description: 'Fecha de fin (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'buscar',
    required: false,
    type: String,
    description: 'Buscar en descripción',
  })
  @ApiQuery({
    name: 'solo_criticos',
    required: false,
    type: Boolean,
    description: 'Solo eventos críticos',
  })
  @ApiQuery({
    name: 'excluir_lectura',
    required: false,
    type: Boolean,
    description: 'Excluir eventos de lectura',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos obtenida exitosamente',
    type: 'PaginatedAuditoriaResponse',
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  async obtenerEventos(
    @Query() paginationDto: PaginationDto,
    @Query() filtrosDto: AuditoriaFiltersDto,
    @Request() req: any,
  ): Promise<PaginatedAuditoriaResponse> {
    const { page = 1, limit = 10 } = paginationDto;

    return await this.auditoriaService.obtenerEventos(
      req.user.empresa_id,
      page,
      limit,
      filtrosDto,
    );
  }

  /**
   * Obtener evento específico por ID
   */
  @Get(':id')
  // @Roles('admin', 'auditor')
  @ApiOperation({
    summary: 'Obtener evento específico',
    description: 'Obtiene los detalles de un evento de auditoría específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del evento de auditoría',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Evento obtenido exitosamente',
    type: 'AuditoriaFormatted',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  async obtenerEventoPorId(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<AuditoriaFormatted> {
    const evento = await this.auditoriaService.obtenerEventoPorId(
      id,
      req.user.empresa_id,
    );

    if (!evento) {
      throw new NotFoundException('Evento de auditoría no encontrado');
    }

    return evento;
  }

  /**
   * Obtener estadísticas de auditoría
   */
  @Get('estadisticas/resumen')
  // @Roles('admin', 'auditor')
  @ApiOperation({
    summary: 'Obtener estadísticas de auditoría',
    description: 'Obtiene estadísticas resumidas de los eventos de auditoría',
  })
  @ApiQuery({
    name: 'fecha_inicio',
    required: false,
    type: String,
    description: 'Fecha de inicio para el filtro (formato: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: false,
    type: String,
    description: 'Fecha de fin para el filtro (formato: YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    type: 'AuditoriaStats',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  async obtenerEstadisticas(
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
    @Request() req?: any,
  ): Promise<AuditoriaStats> {
    return await this.auditoriaService.obtenerEstadisticas(
      req.user.empresa_id,
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * Exportar eventos de auditoría
   */
  @Post('exportar')
  // @Roles('admin', 'auditor')
  @ApiOperation({
    summary: 'Exportar eventos de auditoría',
    description:
      'Exporta eventos de auditoría en diferentes formatos (Excel, CSV, PDF)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        formato: {
          type: 'string',
          enum: ['excel', 'csv', 'pdf'],
          description: 'Formato de exportación',
          example: 'excel',
        },
        filtros: {
          type: 'object',
          description: 'Filtros para la exportación',
        },
        incluir_metadatos: {
          type: 'boolean',
          description: 'Incluir metadatos en la exportación',
          default: false,
        },
        incluir_datos_cambios: {
          type: 'boolean',
          description: 'Incluir datos de cambios en la exportación',
          default: true,
        },
        fecha_inicio: {
          type: 'string',
          format: 'date-time',
          description: 'Fecha de inicio para exportación',
        },
        fecha_fin: {
          type: 'string',
          format: 'date-time',
          description: 'Fecha de fin para exportación',
        },
      },
      required: ['formato'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo exportado exitosamente',
    headers: {
      'Content-Type': {
        description: 'Tipo de contenido del archivo',
        schema: { type: 'string' },
      },
      'Content-Disposition': {
        description: 'Disposición del contenido para descarga',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de exportación inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  async exportarEventos(
    @Body() opciones: AuditoriaExportOptions,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    if (!['csv', 'excel', 'pdf'].includes(opciones.formato)) {
      throw new BadRequestException('Formato de exportación no válido');
    }

    const buffer = await this.auditoriaService.exportarEventos(
      req.user.empresa_id,
      opciones,
    );

    const fecha = new Date().toISOString().split('T')[0];
    const extension = opciones.formato === 'excel' ? 'xlsx' : opciones.formato;
    const filename = `auditoria_${fecha}.${extension}`;

    let contentType: string;
    switch (opciones.formato) {
      case 'excel':
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).send(buffer);
  }

  /**
   * Limpiar eventos antiguos (solo administradores)
   */
  @Post('limpiar')
  // @Roles('admin')
  @ApiOperation({
    summary: 'Limpiar eventos antiguos',
    description:
      'Elimina eventos de auditoría antiguos según los días de retención especificados',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dias_retencion: {
          type: 'number',
          description:
            'Días de retención (eventos más antiguos serán eliminados)',
          example: 90,
          minimum: 30,
          maximum: 365,
        },
      },
      required: ['dias_retencion'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Eventos limpiados exitosamente',
    schema: {
      type: 'object',
      properties: {
        mensaje: { type: 'string' },
        eventos_eliminados: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async limpiarEventosAntiguos(
    @Body('dias_retencion') diasRetencion: number = 90,
  ): Promise<{ mensaje: string; eventos_eliminados: number }> {
    if (!diasRetencion || diasRetencion < 30 || diasRetencion > 365) {
      throw new BadRequestException(
        'Los días de retención deben estar entre 30 y 365',
      );
    }

    const eventosEliminados =
      await this.auditoriaService.limpiarEventosAntiguos(diasRetencion);

    return {
      mensaje: `Limpieza completada exitosamente`,
      eventos_eliminados: eventosEliminados,
    };
  }

  /**
   * Obtener tipos de acciones disponibles
   */
  @Get('metadata/acciones')
  // @Roles('admin', 'auditor', 'usuario')
  @ApiOperation({
    summary: 'Obtener tipos de acciones disponibles',
    description:
      'Retorna la lista de tipos de acciones disponibles para auditoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de acciones obtenida exitosamente',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async obtenerTiposAcciones(): Promise<string[]> {
    return [
      'crear',
      'leer',
      'actualizar',
      'eliminar',
      'login',
      'logout',
      'acceso_denegado',
      'exportar',
      'importar',
      'configurar',
    ];
  }

  /**
   * Obtener tipos de recursos disponibles
   */
  @Get('metadata/recursos')
  // @Roles('admin', 'auditor', 'usuario')
  @ApiOperation({
    summary: 'Obtener tipos de recursos disponibles',
    description:
      'Retorna la lista de tipos de recursos disponibles para auditoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de recursos obtenida exitosamente',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async obtenerTiposRecursos(): Promise<string[]> {
    return [
      'usuario',
      'empresa',
      'cliente',
      'producto',
      'venta',
      'compra',
      'inventario',
      'reporte',
      'configuracion',
      'sistema',
      'email',
      'whatsapp',
      'notificacion',
      'archivo',
      'auditoria',
    ];
  }

  /**
   * Obtener niveles de severidad disponibles
   */
  @Get('metadata/severidades')
  // @Roles('admin', 'auditor', 'usuario')
  @ApiOperation({
    summary: 'Obtener niveles de severidad disponibles',
    description:
      'Retorna la lista de niveles de severidad disponibles para auditoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de severidades obtenida exitosamente',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async obtenerNivelesSeveridad(): Promise<string[]> {
    return ['info', 'warning', 'error', 'critical'];
  }

  /**
   * Verificar estado del sistema de auditoría
   */
  @Get('health/status')
  // @Roles('admin', 'auditor')
  @ApiOperation({
    summary: 'Estado del sistema de auditoría',
    description: 'Verifica el estado y salud del sistema de auditoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del sistema obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        version: { type: 'string' },
        eventos_ultimo_dia: { type: 'number' },
        espacio_utilizado: { type: 'string' },
      },
    },
  })
  async obtenerEstadoSistema(@Request() req: any): Promise<{
    status: string;
    timestamp: string;
    version: string;
    eventos_ultimo_dia: number;
    espacio_utilizado: string;
  }> {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const estadisticas = await this.auditoriaService.obtenerEstadisticas(
      req.user.empresa_id,
      ayer.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0],
    );

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      eventos_ultimo_dia: estadisticas.total_eventos,
      espacio_utilizado: 'N/A', // Se puede calcular según necesidades
    };
  }
}
