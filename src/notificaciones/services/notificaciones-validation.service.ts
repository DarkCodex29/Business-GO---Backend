import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { UpdateNotificacionDto } from '../dto/update-notificacion.dto';

@Injectable()
export class NotificacionesValidationService {
  private readonly logger = new Logger(NotificacionesValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida que el cliente existe y pertenece a la empresa
   */
  async validateClienteEmpresa(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      this.logger.warn(
        `Cliente ${clienteId} no encontrado o no pertenece a la empresa ${empresaId}`,
      );
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado o no pertenece a la empresa`,
      );
    }
  }

  /**
   * Valida que la notificación existe y pertenece a la empresa
   */
  async validateNotificacionExists(
    notificacionId: number,
    empresaId: number,
  ): Promise<any> {
    const notificacion = await this.prisma.notificacion.findFirst({
      where: {
        id_notificacion: notificacionId,
        cliente: {
          empresas: {
            some: {
              empresa_id: empresaId,
            },
          },
        },
      },
      include: {
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!notificacion) {
      this.logger.warn(
        `Notificación ${notificacionId} no encontrada para empresa ${empresaId}`,
      );
      throw new NotFoundException(
        `Notificación con ID ${notificacionId} no encontrada`,
      );
    }

    return notificacion;
  }

  /**
   * Valida los datos de creación de notificación
   */
  validateCreateData(createNotificacionDto: CreateNotificacionDto): void {
    // Validar contenido
    if (
      !createNotificacionDto.contenido ||
      createNotificacionDto.contenido.trim().length === 0
    ) {
      throw new BadRequestException(
        'El contenido de la notificación es requerido',
      );
    }

    if (createNotificacionDto.contenido.length > 1000) {
      throw new BadRequestException(
        'El contenido de la notificación no puede exceder 1000 caracteres',
      );
    }

    // Validar título si existe
    if (
      createNotificacionDto.titulo &&
      createNotificacionDto.titulo.length > 200
    ) {
      throw new BadRequestException(
        'El título no puede exceder 200 caracteres',
      );
    }

    // Validar enlace si existe
    if (createNotificacionDto.enlace) {
      try {
        new URL(createNotificacionDto.enlace);
      } catch {
        throw new BadRequestException('El enlace proporcionado no es válido');
      }
    }

    // Validar datos adicionales si existen
    if (createNotificacionDto.datosAdicionales) {
      try {
        JSON.parse(createNotificacionDto.datosAdicionales);
      } catch {
        throw new BadRequestException(
          'Los datos adicionales deben ser un JSON válido',
        );
      }
    }

    // Validar que no contenga contenido spam (básico)
    const contenidoLower = createNotificacionDto.contenido.toLowerCase();
    const palabrasSpam = [
      'spam',
      'click aquí',
      'oferta limitada',
      'urgente',
      'gratis',
    ];

    let contadorSpam = 0;
    for (const palabra of palabrasSpam) {
      if (contenidoLower.includes(palabra)) {
        contadorSpam++;
      }
    }

    if (contadorSpam >= 3) {
      throw new BadRequestException(
        'El contenido de la notificación parece ser spam',
      );
    }
  }

  /**
   * Valida los datos de actualización de notificación
   */
  validateUpdateData(updateDto: UpdateNotificacionDto): void {
    // Validar contenido si se proporciona
    if (updateDto.contenido !== undefined) {
      if (!updateDto.contenido || updateDto.contenido.trim().length === 0) {
        throw new BadRequestException('El contenido no puede estar vacío');
      }

      if (updateDto.contenido.length > 1000) {
        throw new BadRequestException(
          'El contenido no puede exceder 1000 caracteres',
        );
      }
    }

    // Validar enlace si se proporciona
    if (updateDto.enlace !== undefined && updateDto.enlace) {
      try {
        new URL(updateDto.enlace);
      } catch {
        throw new BadRequestException('El enlace proporcionado no es válido');
      }
    }

    // Validar datos adicionales si se proporcionan
    if (
      updateDto.datosAdicionales !== undefined &&
      updateDto.datosAdicionales
    ) {
      try {
        JSON.parse(updateDto.datosAdicionales);
      } catch {
        throw new BadRequestException(
          'Los datos adicionales deben ser un JSON válido',
        );
      }
    }
  }

  /**
   * Valida parámetros de paginación
   */
  validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new BadRequestException('La página debe ser mayor a 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100');
    }
  }

  /**
   * Valida filtros de búsqueda específicos para notificaciones
   */
  validateSearchFilters(filters: any): void {
    // Validar estado si se proporciona
    if (filters.estado) {
      const estadosValidos = ['pendiente', 'enviada', 'fallida', 'leida'];
      if (!estadosValidos.includes(filters.estado)) {
        throw new BadRequestException(
          `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`,
        );
      }
    }

    // Validar fechas si se proporcionan
    if (filters.fecha_desde) {
      const fechaDesde = new Date(filters.fecha_desde);
      if (isNaN(fechaDesde.getTime())) {
        throw new BadRequestException('La fecha desde no es válida');
      }
    }

    if (filters.fecha_hasta) {
      const fechaHasta = new Date(filters.fecha_hasta);
      if (isNaN(fechaHasta.getTime())) {
        throw new BadRequestException('La fecha hasta no es válida');
      }
    }

    // Validar coherencia entre fechas
    if (filters.fecha_desde && filters.fecha_hasta) {
      const fechaDesde = new Date(filters.fecha_desde);
      const fechaHasta = new Date(filters.fecha_hasta);

      if (fechaDesde > fechaHasta) {
        throw new BadRequestException(
          'La fecha desde no puede ser mayor que la fecha hasta',
        );
      }
    }

    // Validar longitud de búsqueda en mensaje
    if (filters.buscar_mensaje && filters.buscar_mensaje.length < 3) {
      throw new BadRequestException(
        'La búsqueda en mensajes debe tener al menos 3 caracteres',
      );
    }

    // Validar cliente_id si se proporciona
    if (
      filters.cliente_id &&
      (!Number.isInteger(filters.cliente_id) || filters.cliente_id <= 0)
    ) {
      throw new BadRequestException(
        'El ID del cliente debe ser un número entero positivo',
      );
    }
  }

  /**
   * Valida que se pueden crear notificaciones masivas
   */
  async validateBulkNotification(
    empresaId: number,
    clienteIds?: number[],
  ): Promise<void> {
    if (clienteIds && clienteIds.length > 0) {
      // Validar que no se excedan los límites
      if (clienteIds.length > 1000) {
        throw new BadRequestException(
          'No se pueden enviar notificaciones a más de 1000 clientes a la vez',
        );
      }

      // Validar que todos los clientes pertenecen a la empresa
      const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
        where: {
          cliente_id: { in: clienteIds },
          empresa_id: empresaId,
        },
      });

      if (clientesEmpresa.length !== clienteIds.length) {
        throw new BadRequestException(
          'Uno o más clientes no pertenecen a la empresa especificada',
        );
      }
    } else {
      // Validar que la empresa no tenga demasiados clientes para envío masivo
      const totalClientes = await this.prisma.clienteEmpresa.count({
        where: { empresa_id: empresaId },
      });

      if (totalClientes > 5000) {
        throw new BadRequestException(
          'La empresa tiene demasiados clientes para envío masivo. Use filtros específicos.',
        );
      }
    }
  }

  /**
   * Valida límites de envío de notificaciones por empresa (anti-spam)
   */
  async validateSendingLimits(empresaId: number): Promise<void> {
    const ahora = new Date();
    const hace24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

    // Contar notificaciones enviadas en las últimas 24 horas
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const notificacionesRecientes = await this.prisma.notificacion.count({
      where: {
        id_cliente: { in: clienteIds },
        fecha_notificacion: {
          gte: hace24Horas,
        },
      },
    });

    // Límite de 10,000 notificaciones por día por empresa
    if (notificacionesRecientes >= 10000) {
      throw new BadRequestException(
        'Se ha alcanzado el límite diario de notificaciones para esta empresa',
      );
    }
  }

  /**
   * Valida cumplimiento de políticas de comunicación peruanas
   */
  validatePoliticasComunicacion(notificacion: any): boolean {
    // Validar horarios permitidos (8 AM - 8 PM)
    const ahora = new Date();
    const hora = ahora.getHours();

    if (hora < 8 || hora > 20) {
      this.logger.warn('Intento de envío fuera del horario permitido');
      return false;
    }

    // Validar que no sea domingo (día de descanso)
    const diaSemana = ahora.getDay();
    if (diaSemana === 0) {
      this.logger.warn('Intento de envío en domingo');
      return false;
    }

    // Validar contenido apropiado
    if (notificacion.mensaje) {
      const contenido = notificacion.mensaje.toLowerCase();
      const palabrasProhibidas = [
        'préstamo rápido',
        'dinero fácil',
        'gana dinero',
        'inversión garantizada',
        'sin verificación',
      ];

      for (const palabra of palabrasProhibidas) {
        if (contenido.includes(palabra)) {
          this.logger.warn(`Contenido inapropiado detectado: ${palabra}`);
          return false;
        }
      }
    }

    return true;
  }
}
