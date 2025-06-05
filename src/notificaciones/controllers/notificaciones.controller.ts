import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificacionesService } from '../services/notificaciones.service';
import { NotificacionesWhatsappBridgeService } from '../services/notificaciones-whatsapp-bridge.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { UpdateNotificacionDto } from '../dto/update-notificacion.dto';
import { CreateNotificacionBulkDto } from '../dto/create-notificacion-bulk.dto';
import { CreateNotificacionFeedbackDto } from '../dto/create-notificacion-feedback.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('empresas/:empresaId/notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly whatsappBridge: NotificacionesWhatsappBridgeService,
  ) {}

  // CRUD básico de notificaciones

  @Post('clientes/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.SEND] })
  @ApiOperation({ summary: 'Crear notificación para un cliente específico' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 201,
    description: 'Notificación creada exitosamente',
  })
  async create(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() createNotificacionDto: CreateNotificacionDto,
  ) {
    return await this.notificacionesService.create(
      +empresaId,
      +clienteId,
      createNotificacionDto,
    );
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({
    summary: 'Obtener todas las notificaciones de la empresa con paginación',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'cliente_id',
    required: false,
    description: 'Filtrar por cliente',
  })
  @ApiQuery({
    name: 'fecha_desde',
    required: false,
    description: 'Filtrar desde fecha',
  })
  @ApiQuery({
    name: 'fecha_hasta',
    required: false,
    description: 'Filtrar hasta fecha',
  })
  @ApiQuery({
    name: 'buscar_mensaje',
    required: false,
    description: 'Buscar en mensaje',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de notificaciones de la empresa',
  })
  async findAll(
    @Param('empresaId') empresaId: number,
    @Query() paginationDto: PaginationDto,
    @Query() filters: any,
  ) {
    return await this.notificacionesService.findAll(
      +empresaId,
      paginationDto,
      filters,
    );
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener una notificación específica' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la notificación',
  })
  async findOne(
    @Param('empresaId') empresaId: number,
    @Param('id') id: number,
  ) {
    return await this.notificacionesService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.WRITE] })
  @ApiOperation({ summary: 'Actualizar una notificación' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: 200,
    description: 'Notificación actualizada exitosamente',
  })
  async update(
    @Param('empresaId') empresaId: number,
    @Param('id') id: number,
    @Body() updateNotificacionDto: UpdateNotificacionDto,
  ) {
    return await this.notificacionesService.update(
      +id,
      +empresaId,
      updateNotificacionDto,
    );
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.DELETE] })
  @ApiOperation({ summary: 'Eliminar una notificación' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: 200,
    description: 'Notificación eliminada exitosamente',
  })
  async remove(@Param('empresaId') empresaId: number, @Param('id') id: number) {
    await this.notificacionesService.remove(+id, +empresaId);
    return { message: 'Notificación eliminada exitosamente' };
  }

  // Endpoints específicos

  @Get('clientes/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener notificaciones de un cliente específico' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones del cliente',
  })
  async findByCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.notificacionesService.findByCliente(
      +empresaId,
      +clienteId,
      paginationDto,
    );
  }

  @Get('estado/pendientes')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener notificaciones pendientes de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones pendientes',
  })
  async findPendientes(
    @Param('empresaId') empresaId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.notificacionesService.findPendientes(
      +empresaId,
      paginationDto,
    );
  }

  @Patch(':id/marcar-leida')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.WRITE] })
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: 200,
    description: 'Notificación marcada como leída exitosamente',
  })
  async marcarLeida(
    @Param('empresaId') empresaId: number,
    @Param('id') id: number,
  ) {
    return await this.notificacionesService.marcarLeida(+id, +empresaId);
  }

  // Notificaciones masivas

  @Post('bulk')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.BULK] })
  @ApiOperation({ summary: 'Crear notificaciones masivas' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Notificaciones masivas creadas exitosamente',
  })
  async createBulk(
    @Param('empresaId') empresaId: number,
    @Body() createNotificacionBulkDto: CreateNotificacionBulkDto,
  ) {
    return await this.notificacionesService.createNotificacionBulk(
      +empresaId,
      createNotificacionBulkDto,
    );
  }

  // Feedback de notificaciones

  @Post('clientes/:clienteId/feedback')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.NOTIFICACIONES.FEEDBACK.WRITE],
  })
  @ApiOperation({ summary: 'Registrar feedback sobre una notificación' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 201,
    description: 'Feedback registrado exitosamente',
  })
  async createFeedback(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() createFeedbackDto: CreateNotificacionFeedbackDto,
  ) {
    return await this.notificacionesService.createNotificacionFeedback(
      +empresaId,
      +clienteId,
      createFeedbackDto,
    );
  }

  @Get('clientes/:clienteId/feedback')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.NOTIFICACIONES.FEEDBACK.READ],
  })
  @ApiOperation({ summary: 'Obtener feedback de notificaciones de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedback del cliente',
  })
  async getFeedbackCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return await this.notificacionesService.getNotificacionFeedbackCliente(
      +empresaId,
      +clienteId,
    );
  }

  @Get('feedback')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.NOTIFICACIONES.FEEDBACK.READ],
  })
  @ApiOperation({
    summary: 'Obtener todos los feedback de notificaciones de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los feedback de la empresa',
  })
  async getFeedbackEmpresa(@Param('empresaId') empresaId: number) {
    return await this.notificacionesService.getNotificacionFeedbackEmpresa(
      +empresaId,
    );
  }

  // Métricas y análisis

  @Get('metricas/generales')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener métricas generales de notificaciones' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Métricas generales de notificaciones',
  })
  async getMetricasGenerales(@Param('empresaId') empresaId: number) {
    return await this.notificacionesService.getMetricasGenerales(+empresaId);
  }

  @Get('clientes/:clienteId/estadisticas')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({
    summary: 'Obtener estadísticas de notificaciones de un cliente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del cliente',
  })
  async getEstadisticasCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return await this.notificacionesService.getEstadisticasCliente(
      +empresaId,
      +clienteId,
    );
  }

  @Get('metricas/tendencia')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener tendencia de notificaciones' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'dias',
    required: false,
    description: 'Número de días (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencia de notificaciones por día',
  })
  async getTendencia(
    @Param('empresaId') empresaId: number,
    @Query('dias') dias?: number,
  ) {
    return await this.notificacionesService.getTendenciaNotificaciones(
      +empresaId,
      dias ? +dias : 30,
    );
  }

  @Get('metricas/feedback-analisis')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener análisis de feedback' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Análisis de feedback de notificaciones',
  })
  async getAnalisisFeedback(@Param('empresaId') empresaId: number) {
    return await this.notificacionesService.getAnalisisFeedback(+empresaId);
  }

  @Get('clientes/mas-activos')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({ summary: 'Obtener clientes más activos en notificaciones' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'limite',
    required: false,
    description: 'Número de clientes (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes más activos',
  })
  async getClientesMasActivos(
    @Param('empresaId') empresaId: number,
    @Query('limite') limite?: number,
  ) {
    return await this.notificacionesService.getClientesMasActivos(
      +empresaId,
      limite ? +limite : 10,
    );
  }

  // ========================================
  // NUEVOS ENDPOINTS WHATSAPP INTEGRATION
  // ========================================

  @Get('whatsapp/metricas-unificadas')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
  @ApiOperation({
    summary: 'Obtener métricas unificadas de WhatsApp + Notificaciones',
    description:
      'Combina métricas del sistema de notificaciones con datos directos de WhatsApp',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Métricas unificadas del sistema híbrido WhatsApp',
  })
  async getMetricasWhatsAppUnificadas(@Param('empresaId') empresaId: number) {
    return await this.whatsappBridge.getMetricasUnificadas(+empresaId);
  }

  @Post('whatsapp/migrar-consultas')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.BULK] })
  @ApiOperation({
    summary:
      'Migrar consultas existentes de WhatsApp al sistema de notificaciones',
    description: 'Proceso de migración para unificar datos históricos',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'limite',
    required: false,
    description: 'Número máximo de consultas a migrar (default: 100)',
  })
  @ApiResponse({
    status: 201,
    description: 'Migración completada con estadísticas de resultado',
  })
  async migrarConsultasWhatsApp(
    @Param('empresaId') empresaId: number,
    @Query('limite') limite?: number,
  ) {
    return await this.whatsappBridge.migrarConsultasExistentes(
      +empresaId,
      limite ? +limite : 100,
    );
  }

  @Delete('whatsapp/limpiar-antiguas')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.DELETE] })
  @ApiOperation({
    summary: 'Limpiar notificaciones WhatsApp antiguas',
    description:
      'Mantenimiento: elimina notificaciones WhatsApp leídas/enviadas antiguas',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'dias',
    required: false,
    description: 'Días de antigüedad para eliminar (default: 90)',
  })
  @ApiResponse({
    status: 200,
    description: 'Limpieza completada con número de registros eliminados',
  })
  async limpiarNotificacionesWhatsAppAntiguas(
    @Param('empresaId') empresaId: number,
    @Query('dias') dias?: number,
  ) {
    return await this.whatsappBridge.limpiarNotificacionesAntiguas(
      +empresaId,
      dias ? +dias : 90,
    );
  }
}
