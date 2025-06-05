import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { UpdateNotificacionDto } from '../dto/update-notificacion.dto';
import { CreateNotificacionBulkDto } from '../dto/create-notificacion-bulk.dto';
import { CreateNotificacionFeedbackDto } from '../dto/create-notificacion-feedback.dto';
import { PaginationDto } from '../dto/pagination.dto';
import {
  BaseNotificacionesService,
  NotificacionFormatted,
  PaginatedNotificaciones,
  MetricasNotificaciones,
} from './base-notificaciones.service';
import { NotificacionesValidationService } from './notificaciones-validation.service';
import {
  NotificacionesCalculationService,
  EstadisticasCliente,
  TendenciaNotificaciones,
  AnalisisFeedback,
} from './notificaciones-calculation.service';

@Injectable()
export class NotificacionesService extends BaseNotificacionesService {
  protected readonly logger = new Logger(NotificacionesService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: NotificacionesValidationService,
    protected readonly calculationService: NotificacionesCalculationService,
  ) {
    super(prisma, validationService, calculationService);
  }

  /**
   * Crear nueva notificación individual
   */
  async create(
    empresaId: number,
    clienteId: number,
    createNotificacionDto: CreateNotificacionDto,
  ): Promise<NotificacionFormatted> {
    return await this.createNotificacion(
      createNotificacionDto,
      empresaId,
      clienteId,
    );
  }

  /**
   * Obtener notificaciones paginadas con filtros
   */
  async findAll(
    empresaId: number,
    paginationDto: PaginationDto,
    filters: any = {},
  ): Promise<PaginatedNotificaciones> {
    const { page = 1, limit = 10 } = paginationDto;
    return await this.getNotificaciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener una notificación específica
   */
  async findOne(id: number, empresaId: number): Promise<NotificacionFormatted> {
    return await this.formatNotificacionResponse(id, empresaId);
  }

  /**
   * Actualizar notificación
   */
  async update(
    id: number,
    empresaId: number,
    updateNotificacionDto: UpdateNotificacionDto,
  ): Promise<NotificacionFormatted> {
    return await this.updateNotificacion(id, updateNotificacionDto, empresaId);
  }

  /**
   * Eliminar notificación
   */
  async remove(id: number, empresaId: number): Promise<void> {
    await this.deleteNotificacion(id, empresaId);
  }

  /**
   * Obtener notificaciones de un cliente específico
   */
  async findByCliente(
    empresaId: number,
    clienteId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedNotificaciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = { cliente_id: clienteId };
    return await this.getNotificaciones(empresaId, page, limit, filters);
  }

  /**
   * Marcar notificación como leída
   */
  async marcarLeida(
    id: number,
    empresaId: number,
  ): Promise<NotificacionFormatted> {
    return await this.marcarComoLeida(id, empresaId);
  }

  /**
   * Obtener notificaciones pendientes
   */
  async findPendientes(
    empresaId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedNotificaciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = { estado: 'pendiente' };
    return await this.getNotificaciones(empresaId, page, limit, filters);
  }

  // Implementación de métodos abstractos del BaseNotificacionesService

  /**
   * Validaciones previas a la creación de notificación
   */
  protected async preCreateValidation(
    createDto: CreateNotificacionDto,
    empresaId: number,
    clienteId: number,
  ): Promise<void> {
    // Validar que el cliente pertenece a la empresa
    await this.validationService.validateClienteEmpresa(clienteId, empresaId);

    // Validar datos de la notificación
    this.validationService.validateCreateData(createDto);

    // Validar límites de envío
    await this.validationService.validateSendingLimits(empresaId);

    // Validar políticas de comunicación
    const notificacionData = { mensaje: createDto.contenido };
    const cumplePoliticas =
      this.validationService.validatePoliticasComunicacion(notificacionData);

    if (!cumplePoliticas) {
      throw new Error(
        'La notificación no cumple con las políticas de comunicación',
      );
    }
  }

  /**
   * Post-procesamiento después de crear notificación
   */
  protected async postCreateNotificacion(
    notificacion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Notificación ${notificacion.id_notificacion} creada para empresa ${empresaId}`,
    );

    // Aquí se podrían agregar acciones adicionales como:
    // - Envío de notificaciones push
    // - Registro de auditoría
    // - Actualización de métricas en tiempo real
  }

  /**
   * Post-procesamiento después de actualizar notificación
   */
  protected async postUpdateNotificacion(
    notificacion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Notificación ${notificacion.id_notificacion} actualizada para empresa ${empresaId}`,
    );
  }

  /**
   * Pre-procesamiento antes de eliminar notificación
   */
  protected async preDeleteNotificacion(
    id: number,
    empresaId: number,
  ): Promise<void> {
    this.logger.warn(`Eliminando notificación ${id} de empresa ${empresaId}`);

    // Verificar si hay feedback asociado
    const feedbackCount = await this.prisma.feedback.count({
      where: { id_notificacion: id },
    });

    if (feedbackCount > 0) {
      this.logger.warn(
        `La notificación ${id} tiene ${feedbackCount} feedback(s) asociado(s)`,
      );
    }
  }

  /**
   * Post-procesamiento después de eliminar notificación
   */
  protected async postDeleteNotificacion(
    id: number,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(`Notificación ${id} eliminada de empresa ${empresaId}`);
  }

  /**
   * Post-procesamiento después de marcar como leída
   */
  protected async postMarcarLeida(
    notificacion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Notificación ${notificacion.id_notificacion} marcada como leída para empresa ${empresaId}`,
    );

    // Actualizar métricas de apertura en tiempo real si es necesario
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

    if (
      !notificacion ||
      !notificacion.cliente ||
      notificacion.cliente.empresas.length === 0
    ) {
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
              id_empresa: empresaId,
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
            id_empresa: empresaId,
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

  // Métodos adicionales para métricas y análisis

  /**
   * Obtener métricas generales de notificaciones
   */
  async getMetricasGenerales(
    empresaId: number,
  ): Promise<MetricasNotificaciones> {
    return await this.calculationService.calculateMetricasGenerales(empresaId);
  }

  /**
   * Obtener estadísticas de un cliente específico
   */
  async getEstadisticasCliente(
    empresaId: number,
    clienteId: number,
  ): Promise<EstadisticasCliente> {
    return await this.calculationService.calculateEstadisticasCliente(
      clienteId,
      empresaId,
    );
  }

  /**
   * Obtener tendencia de notificaciones
   */
  async getTendenciaNotificaciones(
    empresaId: number,
    dias: number = 30,
  ): Promise<TendenciaNotificaciones[]> {
    return await this.calculationService.calculateTendenciaNotificaciones(
      empresaId,
      dias,
    );
  }

  /**
   * Obtener análisis de feedback
   */
  async getAnalisisFeedback(empresaId: number): Promise<AnalisisFeedback> {
    return await this.calculationService.calculateAnalisisFeedback(empresaId);
  }

  /**
   * Obtener clientes más activos
   */
  async getClientesMasActivos(
    empresaId: number,
    limite: number = 10,
  ): Promise<EstadisticasCliente[]> {
    return await this.calculationService.getClientesMasActivos(
      empresaId,
      limite,
    );
  }
}
