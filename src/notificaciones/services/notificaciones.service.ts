import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { CreateNotificacionBulkDto } from '../dto/create-notificacion-bulk.dto';
import { CreateNotificacionFeedbackDto } from '../dto/create-notificacion-feedback.dto';
import { CreateFidelizacionDto } from '../../fidelizacion/dto/create-fidelizacion.dto';
import { UpdatePuntosFidelizacionDto } from '../../fidelizacion/dto/update-puntos-fidelizacion.dto';

@Injectable()
export class ClientesNotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Notificaciones individuales
  async createNotificacion(
    empresaId: number,
    clienteId: number,
    createNotificacionDto: CreateNotificacionDto,
  ) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    return this.prisma.notificacion.create({
      data: {
        mensaje: createNotificacionDto.contenido,
        id_cliente: clienteId,
        estado: 'pendiente',
      },
    });
  }

  async getNotificacionesCliente(empresaId: number, clienteId: number) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    return this.prisma.notificacion.findMany({
      where: {
        id_cliente: clienteId,
      },
      orderBy: {
        fecha_notificacion: 'desc',
      },
    });
  }

  async getNotificacionesEmpresa(empresaId: number) {
    // Obtener todos los clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    // Obtener todas las notificaciones de los clientes de la empresa
    return this.prisma.notificacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fecha_notificacion: 'desc',
      },
    });
  }

  async getNotificacionesPendientesEmpresa(empresaId: number) {
    // Obtener todos los clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    // Obtener las notificaciones pendientes de los clientes de la empresa
    return this.prisma.notificacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
        estado: 'pendiente',
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fecha_notificacion: 'desc',
      },
    });
  }

  async marcarNotificacionLeida(empresaId: number, notificacionId: number) {
    const notificacion = await this.prisma.notificacion.findFirst({
      where: {
        id_notificacion: notificacionId,
      },
      include: {
        cliente: {
          include: {
            empresas: {
              where: {
                empresa_id: empresaId,
              },
            },
          },
        },
      },
    });

    if (!notificacion || notificacion.cliente.empresas.length === 0) {
      throw new NotFoundException(
        `Notificación con ID ${notificacionId} no encontrada para la empresa ${empresaId}`,
      );
    }

    return this.prisma.notificacion.update({
      where: { id_notificacion: notificacionId },
      data: { estado: 'leida' },
    });
  }

  // Notificaciones masivas
  async createNotificacionBulk(
    empresaId: number,
    createNotificacionBulkDto: CreateNotificacionBulkDto,
  ) {
    const { clienteIds, ...notificacionData } = createNotificacionBulkDto;

    // Si se proporcionan IDs específicos, crear notificaciones solo para esos clientes
    if (clienteIds && clienteIds.length > 0) {
      // Verificar que todos los clientes pertenecen a la empresa
      const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
        where: {
          cliente_id: { in: clienteIds },
          empresa_id: empresaId,
        },
      });

      if (clientesEmpresa.length !== clienteIds.length) {
        throw new NotFoundException(
          'Uno o más clientes no pertenecen a la empresa especificada',
        );
      }

      // Crear notificaciones para cada cliente
      const notificaciones = await Promise.all(
        clienteIds.map((clienteId) =>
          this.prisma.notificacion.create({
            data: {
              mensaje: notificacionData.contenido,
              id_cliente: clienteId,
              estado: 'pendiente',
            },
          }),
        ),
      );

      return notificaciones;
    }

    // Si no se proporcionan IDs, crear notificaciones para todos los clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const notificaciones = await Promise.all(
      clientesEmpresa.map((clienteEmpresa) =>
        this.prisma.notificacion.create({
          data: {
            mensaje: notificacionData.contenido,
            id_cliente: clienteEmpresa.cliente_id,
            estado: 'pendiente',
          },
        }),
      ),
    );

    return notificaciones;
  }

  // Feedback de Notificaciones
  async createNotificacionFeedback(
    empresaId: number,
    clienteId: number,
    createFeedbackDto: CreateNotificacionFeedbackDto,
  ) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    // Si se proporciona un notificacionId, verificar que pertenece al cliente
    if (createFeedbackDto.notificacionId) {
      const notificacion = await this.prisma.notificacion.findFirst({
        where: {
          id_notificacion: createFeedbackDto.notificacionId,
          id_cliente: clienteId,
        },
      });

      if (!notificacion) {
        throw new NotFoundException(
          `Notificación con ID ${createFeedbackDto.notificacionId} no encontrada para el cliente ${clienteId}`,
        );
      }
    }

    return this.prisma.feedback.create({
      data: {
        comentario: createFeedbackDto.descripcion,
        id_cliente: clienteId,
        id_notificacion: createFeedbackDto.notificacionId,
      },
    });
  }

  async getNotificacionFeedbackCliente(empresaId: number, clienteId: number) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    return this.prisma.feedback.findMany({
      where: {
        id_cliente: clienteId,
        id_notificacion: { not: null },
      },
      include: {
        notificacion: true,
      },
      orderBy: {
        fecha_feedback: 'desc',
      },
    });
  }

  async getNotificacionFeedbackEmpresa(empresaId: number) {
    // Obtener todos los clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    // Obtener todos los feedback de notificaciones de los clientes de la empresa
    return this.prisma.feedback.findMany({
      where: {
        id_cliente: { in: clienteIds },
        id_notificacion: { not: null },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
          },
        },
        notificacion: true,
      },
      orderBy: {
        fecha_feedback: 'desc',
      },
    });
  }

  // Fidelización
  async createFidelizacion(
    empresaId: number,
    createFidelizacionDto: CreateFidelizacionDto,
  ) {
    // Verificar si ya existe un programa de fidelización para la empresa
    const fidelizacionExistente = await this.prisma.fidelizacion.findFirst({
      where: {
        cliente: {
          empresas: {
            some: {
              empresa_id: empresaId,
            },
          },
        },
      },
    });

    if (fidelizacionExistente) {
      throw new Error(
        `Ya existe un programa de fidelización para la empresa ${empresaId}`,
      );
    }

    // Obtener un cliente de la empresa para crear el programa de fidelización
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: { empresa_id: empresaId },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `No se encontraron clientes para la empresa ${empresaId}`,
      );
    }

    return this.prisma.fidelizacion.create({
      data: {
        id_cliente: clienteEmpresa.cliente_id,
        fecha_inicio: new Date(),
        puntos_actuales: 0,
      },
    });
  }

  async getFidelizacionCliente(empresaId: number, clienteId: number) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    // Obtener el programa de fidelización del cliente
    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
        cliente: {
          empresas: {
            some: {
              empresa_id: empresaId,
            },
          },
        },
      },
    });

    if (!fidelizacion) {
      throw new NotFoundException(
        `No existe un programa de fidelización para el cliente ${clienteId}`,
      );
    }

    return fidelizacion;
  }

  async getFidelizacionEmpresa(empresaId: number) {
    // Obtener todos los clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    // Obtener los programas de fidelización de todos los clientes de la empresa
    return this.prisma.fidelizacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        puntos_actuales: 'desc',
      },
    });
  }

  async updatePuntosFidelizacion(
    empresaId: number,
    clienteId: number,
    updatePuntosFidelizacionDto: UpdatePuntosFidelizacionDto,
  ) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    // Verificar que existe un programa de fidelización
    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
        cliente: {
          empresas: {
            some: {
              empresa_id: empresaId,
            },
          },
        },
      },
    });

    if (!fidelizacion) {
      throw new NotFoundException(
        `No existe un programa de fidelización para el cliente ${clienteId}`,
      );
    }

    // Actualizar los puntos del cliente
    return this.prisma.fidelizacion.update({
      where: { id_fidelizacion: fidelizacion.id_fidelizacion },
      data: {
        puntos_actuales: updatePuntosFidelizacionDto.puntos_actuales,
        fecha_fin: updatePuntosFidelizacionDto.fecha_fin
          ? new Date(updatePuntosFidelizacionDto.fecha_fin)
          : undefined,
      },
    });
  }
}
