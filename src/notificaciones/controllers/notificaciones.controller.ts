import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClientesNotificacionesService } from '../services/notificaciones.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { CreateNotificacionBulkDto } from '../dto/create-notificacion-bulk.dto';
import { CreateNotificacionFeedbackDto } from '../dto/create-notificacion-feedback.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
export class ClientesNotificacionesController {
  constructor(
    private readonly clientesNotificacionesService: ClientesNotificacionesService,
  ) {}

  // Notificaciones individuales
  @Post('clientes/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.SEND] })
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

  @Get('clientes/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
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

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
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

  @Get('pendientes')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.READ] })
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

  @Patch(':notificacionId/leida')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.WRITE] })
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'notificacionId', description: 'ID de la notificación' })
  @ApiResponse({
    status: 200,
    description: 'Notificación marcada como leída exitosamente',
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
  @Post('bulk')
  @EmpresaPermissions({ permissions: [PERMISSIONS.NOTIFICACIONES.BULK] })
  @ApiOperation({ summary: 'Crear notificaciones en bulk' })
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

  // Feedback de Notificaciones
  @Post('clientes/:clienteId/notificacion-feedback')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.NOTIFICACIONES.FEEDBACK.WRITE],
  })
  @ApiOperation({ summary: 'Registrar feedback sobre una notificación' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 201,
    description: 'Feedback de notificación registrado exitosamente',
  })
  createNotificacionFeedback(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() createNotificacionFeedbackDto: CreateNotificacionFeedbackDto,
  ) {
    return this.clientesNotificacionesService.createNotificacionFeedback(
      empresaId,
      clienteId,
      createNotificacionFeedbackDto,
    );
  }

  @Get('clientes/:clienteId/notificacion-feedback')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.NOTIFICACIONES.FEEDBACK.READ],
  })
  @ApiOperation({ summary: 'Obtener feedback de notificaciones de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedback de notificaciones del cliente',
  })
  getNotificacionFeedbackCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return this.clientesNotificacionesService.getNotificacionFeedbackCliente(
      empresaId,
      clienteId,
    );
  }

  @Get('notificacion-feedback')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.NOTIFICACIONES.FEEDBACK.READ],
  })
  @ApiOperation({
    summary: 'Obtener todos los feedback de notificaciones de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los feedback de notificaciones de la empresa',
  })
  getNotificacionFeedbackEmpresa(@Param('empresaId') empresaId: number) {
    return this.clientesNotificacionesService.getNotificacionFeedbackEmpresa(
      empresaId,
    );
  }
}
