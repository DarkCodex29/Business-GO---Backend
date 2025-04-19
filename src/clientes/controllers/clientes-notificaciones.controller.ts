import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ClientesNotificacionesService } from '../services/clientes-notificaciones.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { CreateNotificacionBulkDto } from '../dto/create-notificacion-bulk.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateFidelizacionDto } from '../dto/create-fidelizacion.dto';
import { UpdatePuntosFidelizacionDto } from '../dto/update-puntos-fidelizacion.dto';

@ApiTags('Notificaciones y Fidelización')
@Controller('empresas/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles('ADMIN', 'EMPRESA')
export class ClientesNotificacionesController {
  constructor(
    private readonly clientesNotificacionesService: ClientesNotificacionesService,
  ) {}

  // Notificaciones individuales
  @Post('clientes/:clienteId/notificaciones')
  @EmpresaPermissions('clientes.notificaciones.crear')
  @ApiOperation({ summary: 'Crear notificación para un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 201,
    description: 'Notificación creada exitosamente',
  })
  createNotificacion(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() createNotificacionDto: CreateNotificacionDto,
  ) {
    return this.clientesNotificacionesService.createNotificacion(
      empresaId,
      clienteId,
      createNotificacionDto,
    );
  }

  @Get('clientes/:clienteId/notificaciones')
  @EmpresaPermissions('clientes.notificaciones.ver')
  @ApiOperation({ summary: 'Obtener notificaciones de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones del cliente',
  })
  getNotificacionesCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return this.clientesNotificacionesService.getNotificacionesCliente(
      empresaId,
      clienteId,
    );
  }

  @Get('notificaciones')
  @EmpresaPermissions('clientes.notificaciones.ver')
  @ApiOperation({ summary: 'Obtener todas las notificaciones de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las notificaciones de la empresa',
  })
  getNotificacionesEmpresa(@Param('empresaId') empresaId: number) {
    return this.clientesNotificacionesService.getNotificacionesEmpresa(
      empresaId,
    );
  }

  @Get('notificaciones/pendientes')
  @EmpresaPermissions('clientes.notificaciones.ver')
  @ApiOperation({ summary: 'Obtener notificaciones pendientes de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones pendientes de la empresa',
  })
  getNotificacionesPendientesEmpresa(@Param('empresaId') empresaId: number) {
    return this.clientesNotificacionesService.getNotificacionesPendientesEmpresa(
      empresaId,
    );
  }

  @Patch('notificaciones/:notificacionId/leer')
  @EmpresaPermissions('clientes.notificaciones.editar')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'notificacionId', description: 'ID de la notificación' })
  @ApiResponse({
    status: 200,
    description: 'Notificación marcada como leída',
  })
  marcarNotificacionLeida(
    @Param('empresaId') empresaId: number,
    @Param('notificacionId') notificacionId: number,
  ) {
    return this.clientesNotificacionesService.marcarNotificacionLeida(
      empresaId,
      notificacionId,
    );
  }

  // Notificaciones masivas
  @Post('notificaciones/bulk')
  @EmpresaPermissions('clientes.notificaciones.crear')
  @ApiOperation({ summary: 'Crear notificaciones masivas' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Notificaciones creadas exitosamente',
  })
  createNotificacionBulk(
    @Param('empresaId') empresaId: number,
    @Body() createNotificacionBulkDto: CreateNotificacionBulkDto,
  ) {
    return this.clientesNotificacionesService.createNotificacionBulk(
      empresaId,
      createNotificacionBulkDto,
    );
  }

  // Feedback
  @Post('clientes/:clienteId/feedback')
  @EmpresaPermissions('clientes.feedback.crear')
  @ApiOperation({ summary: 'Crear feedback de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 201,
    description: 'Feedback creado exitosamente',
  })
  createFeedback(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    return this.clientesNotificacionesService.createFeedback(
      empresaId,
      clienteId,
      createFeedbackDto,
    );
  }

  @Get('clientes/:clienteId/feedback')
  @EmpresaPermissions('clientes.feedback.ver')
  @ApiOperation({ summary: 'Obtener feedback de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedback del cliente',
  })
  getFeedbackCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return this.clientesNotificacionesService.getFeedbackCliente(
      empresaId,
      clienteId,
    );
  }

  @Get('feedback')
  @EmpresaPermissions('clientes.feedback.ver')
  @ApiOperation({ summary: 'Obtener todos los feedback de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los feedback de la empresa',
  })
  getFeedbackEmpresa(@Param('empresaId') empresaId: number) {
    return this.clientesNotificacionesService.getFeedbackEmpresa(empresaId);
  }

  // Fidelización
  @Post('fidelizacion')
  @EmpresaPermissions('clientes.fidelizacion.crear')
  @ApiOperation({ summary: 'Crear programa de fidelización' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Programa de fidelización creado exitosamente',
  })
  createFidelizacion(
    @Param('empresaId') empresaId: number,
    @Body() createFidelizacionDto: CreateFidelizacionDto,
  ) {
    return this.clientesNotificacionesService.createFidelizacion(
      empresaId,
      createFidelizacionDto,
    );
  }

  @Get('clientes/:clienteId/fidelizacion')
  @EmpresaPermissions('clientes.fidelizacion.ver')
  @ApiOperation({ summary: 'Obtener programa de fidelización de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Programa de fidelización del cliente',
  })
  getFidelizacionCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return this.clientesNotificacionesService.getFidelizacionCliente(
      empresaId,
      clienteId,
    );
  }

  @Get('fidelizacion')
  @EmpresaPermissions('clientes.fidelizacion.ver')
  @ApiOperation({
    summary: 'Obtener todos los programas de fidelización de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de programas de fidelización de la empresa',
  })
  getFidelizacionEmpresa(@Param('empresaId') empresaId: number) {
    return this.clientesNotificacionesService.getFidelizacionEmpresa(empresaId);
  }

  @Patch('clientes/:clienteId/fidelizacion/puntos')
  @EmpresaPermissions('clientes.fidelizacion.editar')
  @ApiOperation({ summary: 'Actualizar puntos de fidelización de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Puntos de fidelización actualizados exitosamente',
  })
  updatePuntosFidelizacion(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() updatePuntosFidelizacionDto: UpdatePuntosFidelizacionDto,
  ) {
    return this.clientesNotificacionesService.updatePuntosFidelizacion(
      empresaId,
      clienteId,
      updatePuntosFidelizacionDto,
    );
  }
}
