import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import {
  InventarioAuditService,
  IHistorialMovimiento,
} from '../services/inventario-audit.service';
import {
  InventarioNotificationService,
  IConfiguracionAlerta,
} from '../services/inventario-notification.service';
import {
  InventarioSyncService,
  ISyncVenta,
  ISyncCompra,
  ISyncReserva,
} from '../services/inventario-sync.service';

// DTOs para las nuevas funcionalidades
export class ConfiguracionAlertasDto implements IConfiguracionAlerta {
  empresaId: number;
  stockMinimo: number;
  stockCritico: number;
  habilitarNotificaciones: boolean;
  canalesNotificacion: string[];
  frecuenciaRevisor: number;
  usuariosNotificar: number[];
}

export class SincronizacionVentaDto implements ISyncVenta {
  ventaId: number;
  empresaId: number;
  usuarioId: number;
  items: {
    productoId: number;
    cantidad: number;
    precio: number;
  }[];
  tipoOperacion: 'CONFIRMAR' | 'CANCELAR' | 'DEVOLVER';
}

export class SincronizacionCompraDto implements ISyncCompra {
  compraId: number;
  empresaId: number;
  usuarioId: number;
  items: {
    productoId: number;
    cantidad: number;
    precio: number;
  }[];
  tipoOperacion: 'RECIBIR' | 'CANCELAR' | 'DEVOLVER';
}

export class GestionReservaDto implements ISyncReserva {
  cotizacionId: number;
  empresaId: number;
  usuarioId: number;
  items: {
    productoId: number;
    cantidad: number;
  }[];
  tipoOperacion: 'RESERVAR' | 'LIBERAR';
}

export class FiltrosHistorialDto implements IHistorialMovimiento {
  fechaInicio?: Date;
  fechaFin?: Date;
  productoId?: number;
  usuarioId?: number;
  tipoMovimiento?: any;
  tipoReferencia?: string;
  page?: number;
  limit?: number;
}

@ApiTags('Inventario Avanzado')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
@Controller('inventario-avanzado')
export class InventarioAvanzadoController {
  constructor(
    private readonly auditService: InventarioAuditService,
    private readonly notificationService: InventarioNotificationService,
    private readonly syncService: InventarioSyncService,
  ) {}

  // ===============================
  // AUDITORÍA Y HISTORIAL
  // ===============================

  @Get(':empresaId/historial')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Obtener historial de movimientos de inventario' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'fechaInicio',
    required: false,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaFin',
    required: false,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'productoId',
    required: false,
    description: 'ID del producto',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de movimientos obtenido exitosamente',
  })
  async obtenerHistorialMovimientos(
    @Param('empresaId') empresaId: string,
    @Query() filtros: FiltrosHistorialDto,
  ) {
    return this.auditService.obtenerHistorialMovimientos(+empresaId, filtros);
  }

  @Get(':empresaId/historial/estadisticas')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Obtener estadísticas de movimientos por período' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'fechaInicio',
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({ name: 'fechaFin', description: 'Fecha de fin (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  async obtenerEstadisticasMovimientos(
    @Param('empresaId') empresaId: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    return this.auditService.obtenerEstadisticasMovimientos(
      +empresaId,
      new Date(fechaInicio),
      new Date(fechaFin),
    );
  }

  @Get(':empresaId/validacion-consistencia')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Validar consistencia del inventario' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Validación de consistencia completada',
  })
  async validarConsistenciaInventario(@Param('empresaId') empresaId: string) {
    return this.auditService.validarConsistenciaInventario(+empresaId);
  }

  @Get(':empresaId/reporte-auditoria')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Generar reporte de auditoría exportable' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Reporte de auditoría generado exitosamente',
  })
  async generarReporteAuditoria(
    @Param('empresaId') empresaId: string,
    @Query() filtros: FiltrosHistorialDto,
  ) {
    return this.auditService.generarReporteAuditoria(+empresaId, filtros);
  }

  // ===============================
  // NOTIFICACIONES Y ALERTAS
  // ===============================

  @Post(':empresaId/alertas/configurar')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.WRITE] })
  @ApiOperation({ summary: 'Configurar alertas de inventario para la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Configuración de alertas actualizada exitosamente',
  })
  @HttpCode(HttpStatus.CREATED)
  async configurarAlertas(
    @Param('empresaId') empresaId: string,
    @Body() configuracion: ConfiguracionAlertasDto,
  ) {
    configuracion.empresaId = +empresaId;
    return this.notificationService.configurarAlertas(configuracion);
  }

  @Post(':empresaId/alertas/ejecutar-revision')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Ejecutar revisión manual de inventario' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Revisión de inventario ejecutada exitosamente',
  })
  async ejecutarRevisionInventario(@Param('empresaId') empresaId: string) {
    return this.notificationService.ejecutarRevisionInventario(+empresaId);
  }

  @Get(':empresaId/alertas/dashboard')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Obtener dashboard de alertas activas' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard de alertas obtenido exitosamente',
  })
  async obtenerDashboardAlertas(@Param('empresaId') empresaId: string) {
    return this.notificationService.obtenerDashboardAlertas(+empresaId);
  }

  // ===============================
  // SINCRONIZACIÓN CON VENTAS/COMPRAS
  // ===============================

  @Post(':empresaId/sync/venta')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.WRITE] })
  @ApiOperation({ summary: 'Sincronizar inventario con operación de venta' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Sincronización de venta completada exitosamente',
  })
  async sincronizarVenta(
    @Param('empresaId') empresaId: string,
    @Body() operacion: SincronizacionVentaDto,
    @GetUser() user: any,
  ) {
    operacion.empresaId = +empresaId;
    operacion.usuarioId = user.id_usuario;
    return this.syncService.sincronizarVenta(operacion);
  }

  @Post(':empresaId/sync/compra')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.WRITE] })
  @ApiOperation({ summary: 'Sincronizar inventario con operación de compra' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Sincronización de compra completada exitosamente',
  })
  async sincronizarCompra(
    @Param('empresaId') empresaId: string,
    @Body() operacion: SincronizacionCompraDto,
    @GetUser() user: any,
  ) {
    operacion.empresaId = +empresaId;
    operacion.usuarioId = user.id_usuario;
    return this.syncService.sincronizarCompra(operacion);
  }

  @Post(':empresaId/sync/reserva')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.WRITE] })
  @ApiOperation({ summary: 'Gestionar reservas de stock para cotizaciones' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Gestión de reserva completada exitosamente',
  })
  async gestionarReserva(
    @Param('empresaId') empresaId: string,
    @Body() operacion: GestionReservaDto,
    @GetUser() user: any,
  ) {
    operacion.empresaId = +empresaId;
    operacion.usuarioId = user.id_usuario;
    return this.syncService.gestionarReserva(operacion);
  }

  @Get(':empresaId/sync/validar-reservas')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Validar consistencia entre stock y reservas' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Validación de reservas completada exitosamente',
  })
  async validarConsistenciaReservas(@Param('empresaId') empresaId: string) {
    return this.syncService.validarConsistenciaReservas(+empresaId);
  }

  @Post(':empresaId/sync/reconciliar')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.WRITE] })
  @ApiOperation({
    summary: 'Reconciliar diferencias de inventario automáticamente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliación completada exitosamente',
  })
  async reconciliarInventario(
    @Param('empresaId') empresaId: string,
    @GetUser() user: any,
  ) {
    return this.syncService.reconciliarInventario(+empresaId, user.id_usuario);
  }

  // ===============================
  // OPERACIONES MASIVAS
  // ===============================

  @Post(':empresaId/operaciones/revision-automatica')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Ejecutar revisión automática programada (Solo SUPER_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Revisión automática ejecutada exitosamente',
  })
  async ejecutarRevisionAutomatica() {
    return this.notificationService.programarRevisionesAutomaticas();
  }

  // ===============================
  // REPORTES EJECUTIVOS
  // ===============================

  @Get(':empresaId/reportes/ejecutivo')
  @EmpresaPermissions({ permissions: [PERMISSIONS.INVENTARIO.READ] })
  @ApiOperation({ summary: 'Obtener reporte ejecutivo de inventario' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'periodo',
    required: false,
    description: 'Período: diario, semanal, mensual',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte ejecutivo generado exitosamente',
  })
  async obtenerReporteEjecutivo(
    @Param('empresaId') empresaId: string,
    @Query('periodo') periodo: string = 'mensual',
  ) {
    const fechaFin = new Date();
    let fechaInicio = new Date();

    switch (periodo) {
      case 'diario':
        fechaInicio.setDate(fechaFin.getDate() - 1);
        break;
      case 'semanal':
        fechaInicio.setDate(fechaFin.getDate() - 7);
        break;
      case 'mensual':
      default:
        fechaInicio.setMonth(fechaFin.getMonth() - 1);
        break;
    }

    const [historial, estadisticas, alertas, consistencia, reservas] =
      await Promise.all([
        this.auditService.obtenerHistorialMovimientos(+empresaId, {
          fechaInicio,
          fechaFin,
          limit: 100,
        }),
        this.auditService.obtenerEstadisticasMovimientos(
          +empresaId,
          fechaInicio,
          fechaFin,
        ),
        this.notificationService.obtenerDashboardAlertas(+empresaId),
        this.auditService.validarConsistenciaInventario(+empresaId),
        this.syncService.validarConsistenciaReservas(+empresaId),
      ]);

    return {
      periodo,
      fechaInicio,
      fechaFin,
      resumen: {
        movimientos: estadisticas,
        alertas: alertas.resumen,
        consistencia: {
          inventario: consistencia.porcentajeConsistencia,
          reservas: reservas.inconsistencias,
        },
      },
      detalles: {
        historial: historial.data.slice(0, 20), // Últimos 20 movimientos
        alertasActivas: alertas.alertasRecientes?.slice(0, 10) || [],
        problemasConsistencia: consistencia.inconsistencias?.slice(0, 5) || [],
      },
      metricas: {
        productosAfectados: estadisticas.productosAfectados,
        movimientosPorTipo: estadisticas.movimientosPorTipo,
        tendencia: estadisticas.movimientosPorDia,
      },
    };
  }
}
