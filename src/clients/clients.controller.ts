import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateFidelizacionDto } from './dto/create-fidelizacion.dto';

@ApiTags('Clientes')
@Controller('clientes')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Notificaciones
  @Post('notifications')
  @ApiOperation({ summary: 'Crear una nueva notificación para un cliente' })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.clientsService.createNotification(createNotificationDto);
  }

  @Get('notifications/:clienteId')
  @ApiOperation({ summary: 'Obtener todas las notificaciones de un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones obtenida exitosamente',
  })
  async getNotifications(@Param('clienteId') clienteId: string) {
    return this.clientsService.getNotifications(clienteId);
  }

  @Patch('notifications/:notificacionId/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiResponse({
    status: 200,
    description: 'Notificación marcada como leída exitosamente',
  })
  async markNotificationAsRead(
    @Param('notificacionId') notificacionId: string,
  ) {
    return this.clientsService.markNotificationAsRead(notificacionId);
  }

  // Feedback
  @Post('feedback')
  @ApiOperation({ summary: 'Crear un nuevo feedback de un cliente' })
  @ApiResponse({ status: 201, description: 'Feedback creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async createFeedback(@Body() createFeedbackDto: CreateFeedbackDto) {
    return this.clientsService.createFeedback(createFeedbackDto);
  }

  @Get('feedback/:clienteId')
  @ApiOperation({ summary: 'Obtener todos los feedback de un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedback obtenida exitosamente',
  })
  async getFeedback(@Param('clienteId') clienteId: string) {
    return this.clientsService.getFeedback(clienteId);
  }

  // Fidelización
  @Post('fidelizacion')
  @ApiOperation({
    summary: 'Crear un nuevo programa de fidelización para un cliente',
  })
  @ApiResponse({
    status: 201,
    description: 'Programa de fidelización creado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async createFidelizacion(
    @Body() createFidelizacionDto: CreateFidelizacionDto,
  ) {
    return this.clientsService.createFidelizacion(createFidelizacionDto);
  }

  @Get('fidelizacion/:clienteId')
  @ApiOperation({
    summary: 'Obtener el programa de fidelización de un cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Programa de fidelización obtenido exitosamente',
  })
  async getFidelizacion(@Param('clienteId') clienteId: string) {
    return this.clientsService.getFidelizacion(clienteId);
  }

  @Patch('fidelizacion/:clienteId/puntos')
  @ApiOperation({
    summary: 'Actualizar los puntos de fidelización de un cliente',
  })
  @ApiResponse({ status: 200, description: 'Puntos actualizados exitosamente' })
  @ApiResponse({
    status: 404,
    description: 'Programa de fidelización no encontrado',
  })
  async updateFidelizacionPuntos(
    @Param('clienteId') clienteId: string,
    @Body('puntos') puntos: number,
  ) {
    return this.clientsService.updateFidelizacionPuntos(clienteId, puntos);
  }
}
