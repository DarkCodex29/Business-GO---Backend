import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
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

@ApiTags('Notificaciones y Fidelización de Clientes')
@Controller('empresas/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
export class ClientesNotificacionesController {
  constructor(
    private readonly clientesNotificacionesService: ClientesNotificacionesService,
  ) {}

  // Notificaciones individuales
  @Post('clientes/:clienteId/notifications')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.notificaciones.crear')
  @ApiOperation({ summary: 'Crear una nueva notificación para un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  createNotificacion(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
    @Body() createNotificacionDto: CreateNotificacionDto,
  ) {
    return this.clientesNotificacionesService.createNotificacion(
      +empresaId,
      +clienteId,
      createNotificacionDto,
    );
  }

  @Get('clientes/:clienteId/notifications')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.notificaciones.ver')
  @ApiOperation({ summary: 'Obtener todas las notificaciones de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  getNotificacionesCliente(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
  ) {
    return this.clientesNotificacionesService.getNotificacionesCliente(
      +empresaId,
      +clienteId,
    );
  }

  @Patch('notifications/:notificacionId/read')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.notificaciones.editar')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'notificacionId', description: 'ID de la notificación' })
  marcarNotificacionLeida(
    @Param('empresaId') empresaId: string,
    @Param('notificacionId') notificacionId: string,
  ) {
    return this.clientesNotificacionesService.marcarNotificacionLeida(
      +empresaId,
      +notificacionId,
    );
  }

  // Notificaciones masivas
  @Post('notifications/bulk')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.notificaciones.crear')
  @ApiOperation({ summary: 'Crear notificaciones para todos los clientes' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  createNotificacionBulk(
    @Param('empresaId') empresaId: string,
    @Body() createNotificacionBulkDto: CreateNotificacionBulkDto,
  ) {
    return this.clientesNotificacionesService.createNotificacionBulk(
      +empresaId,
      createNotificacionBulkDto,
    );
  }

  // Feedback
  @Post('clientes/:clienteId/feedback')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.feedback.crear')
  @ApiOperation({ summary: 'Crear un nuevo feedback de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  createFeedback(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    return this.clientesNotificacionesService.createFeedback(
      +empresaId,
      +clienteId,
      createFeedbackDto,
    );
  }

  @Get('clientes/:clienteId/feedback')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.feedback.ver')
  @ApiOperation({ summary: 'Obtener todos los feedback de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  getFeedbackCliente(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
  ) {
    return this.clientesNotificacionesService.getFeedbackCliente(
      +empresaId,
      +clienteId,
    );
  }

  // Fidelización
  @Post('fidelizacion')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.fidelizacion.crear')
  @ApiOperation({ summary: 'Crear un nuevo programa de fidelización' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  createFidelizacion(
    @Param('empresaId') empresaId: string,
    @Body() createFidelizacionDto: CreateFidelizacionDto,
  ) {
    return this.clientesNotificacionesService.createFidelizacion(
      +empresaId,
      createFidelizacionDto,
    );
  }

  @Get('clientes/:clienteId/fidelizacion')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.fidelizacion.ver')
  @ApiOperation({
    summary: 'Obtener el programa de fidelización de un cliente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  getFidelizacionCliente(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
  ) {
    return this.clientesNotificacionesService.getFidelizacionCliente(
      +empresaId,
      +clienteId,
    );
  }

  @Patch('clientes/:clienteId/fidelizacion/puntos')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.fidelizacion.editar')
  @ApiOperation({
    summary: 'Actualizar los puntos de fidelización de un cliente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  updatePuntosFidelizacion(
    @Param('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
    @Body() updatePuntosFidelizacionDto: UpdatePuntosFidelizacionDto,
  ) {
    return this.clientesNotificacionesService.updatePuntosFidelizacion(
      +empresaId,
      +clienteId,
      updatePuntosFidelizacionDto,
    );
  }
}
