import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateFidelizacionDto } from '../dto/create-fidelizacion.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Notificaciones
  async createNotification(createNotificationDto: CreateNotificationDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: parseInt(createNotificationDto.clienteId) },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return this.prisma.notificacion.create({
      data: {
        id_cliente: parseInt(createNotificationDto.clienteId),
        mensaje: createNotificationDto.contenido,
        fecha_notificacion: new Date(),
      },
    });
  }

  async getNotifications(clienteId: string) {
    return this.prisma.notificacion.findMany({
      where: {
        id_cliente: parseInt(clienteId),
      },
      orderBy: { fecha_notificacion: 'desc' },
    });
  }

  async markNotificationAsRead(notificacionId: string) {
    return this.prisma.notificacion.update({
      where: { id_notificacion: parseInt(notificacionId) },
      data: {
        estado: 'leida',
        fecha_notificacion: new Date(),
      },
    });
  }

  // Feedback
  async createFeedback(createFeedbackDto: CreateFeedbackDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: parseInt(createFeedbackDto.clienteId) },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return this.prisma.feedback.create({
      data: {
        id_cliente: parseInt(createFeedbackDto.clienteId),
        comentario: createFeedbackDto.descripcion,
        fecha_feedback: new Date(),
      },
    });
  }

  async getFeedback(clienteId: string) {
    return this.prisma.feedback.findMany({
      where: {
        id_cliente: parseInt(clienteId),
      },
      orderBy: { fecha_feedback: 'desc' },
    });
  }

  // Fidelización
  async createFidelizacion(createFidelizacionDto: CreateFidelizacionDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: parseInt(createFidelizacionDto.clienteId) },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return this.prisma.fidelizacion.create({
      data: {
        id_cliente: parseInt(createFidelizacionDto.clienteId),
        fecha_inicio: createFidelizacionDto.fechaInicio
          ? new Date(createFidelizacionDto.fechaInicio)
          : new Date(),
        fecha_fin: createFidelizacionDto.fechaExpiracion
          ? new Date(createFidelizacionDto.fechaExpiracion)
          : null,
      },
    });
  }

  async getFidelizacion(clienteId: string) {
    return this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: parseInt(clienteId),
      },
    });
  }

  async updateFidelizacionPuntos(clienteId: string, puntos: number) {
    const fidelizacion = await this.getFidelizacion(clienteId);

    if (!fidelizacion) {
      throw new NotFoundException('Programa de fidelización no encontrado');
    }

    return this.prisma.fidelizacion.update({
      where: { id_fidelizacion: fidelizacion.id_fidelizacion },
      data: {
        puntos_actuales: {
          increment: puntos,
        },
      },
    });
  }
}
