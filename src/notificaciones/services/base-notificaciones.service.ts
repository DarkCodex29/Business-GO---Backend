import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificacionDto } from '../dto/create-notificacion.dto';
import { UpdateNotificacionDto } from '../dto/update-notificacion.dto';
import { NotificacionesValidationService } from './notificaciones-validation.service';
import { NotificacionesCalculationService } from './notificaciones-calculation.service';

export interface NotificacionFormatted {
  id_notificacion: number;
  mensaje: string;
  estado: string;
  fecha_notificacion: string;
  cliente: {
    id_cliente: number;
    nombre: string;
    email: string;
  };
  tipo_notificacion?: string;
  enlace?: string;
  datos_adicionales?: any;
  feedback_count?: number;
  es_leida: boolean;
}

export interface PaginatedNotificaciones {
  data: NotificacionFormatted[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MetricasNotificaciones {
  total_notificaciones: number;
  notificaciones_pendientes: number;
  notificaciones_enviadas: number;
  notificaciones_leidas: number;
  tasa_apertura: number;
  tasa_respuesta: number;
  promedio_tiempo_lectura: number;
}

/**
 * Servicio base abstracto para notificaciones
 * Implementa Template Method Pattern siguiendo principios SOLID
 */
@Injectable()
export abstract class BaseNotificacionesService {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: NotificacionesValidationService,
    protected readonly calculationService: NotificacionesCalculationService,
  ) {}

  /**
   * Template Method para crear notificación
   */
  protected async createNotificacion(
    createNotificacionDto: CreateNotificacionDto,
    empresaId: number,
    clienteId: number,
  ): Promise<NotificacionFormatted> {
    // 1. Validaciones previas
    await this.preCreateValidation(createNotificacionDto, empresaId, clienteId);

    // 2. Preparar datos
    const notificacionData = await this.prepareNotificacionData(
      createNotificacionDto,
      clienteId,
    );

    // 3. Crear notificación
    const notificacion = await this.executeCreate(notificacionData);

    // 4. Post-procesamiento
    await this.postCreateNotificacion(notificacion, empresaId);

    // 5. Formatear respuesta
    return await this.formatNotificacionResponse(
      notificacion.id_notificacion,
      empresaId,
    );
  }

  /**
   * Template Method para obtener notificaciones paginadas
   */
  protected async getNotificaciones(
    empresaId: number,
    page: number,
    limit: number,
    filters: any = {},
  ): Promise<PaginatedNotificaciones> {
    // 1. Validar parámetros
    this.validationService.validatePaginationParams(page, limit);
    this.validationService.validateSearchFilters(filters);

    // 2. Construir query
    const whereClause = await this.buildWhereClause(empresaId, filters);

    // 3. Obtener datos
    const [notificaciones, total] = await Promise.all([
      this.executeQuery(whereClause, page, limit),
      this.executeCount(whereClause),
    ]);

    // 4. Formatear resultados
    const formattedNotificaciones = await Promise.all(
      notificaciones.map((notificacion) =>
        this.formatNotificacionItem(notificacion),
      ),
    );

    return {
      data: formattedNotificaciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Template Method para actualizar notificación
   */
  protected async updateNotificacion(
    id: number,
    updateNotificacionDto: UpdateNotificacionDto,
    empresaId: number,
  ): Promise<NotificacionFormatted> {
    // 1. Validar existencia
    await this.validationService.validateNotificacionExists(id, empresaId);

    // 2. Validar datos de actualización
    this.validationService.validateUpdateData(updateNotificacionDto);

    // 3. Preparar datos de actualización
    const updateData = await this.prepareUpdateData(updateNotificacionDto);

    // 4. Ejecutar actualización
    const notificacion = await this.executeUpdate(id, updateData);

    // 5. Post-procesamiento
    await this.postUpdateNotificacion(notificacion, empresaId);

    // 6. Formatear respuesta
    return await this.formatNotificacionResponse(id, empresaId);
  }

  /**
   * Template Method para eliminar notificación
   */
  protected async deleteNotificacion(
    id: number,
    empresaId: number,
  ): Promise<void> {
    // 1. Validar existencia y permisos
    await this.validationService.validateNotificacionExists(id, empresaId);

    // 2. Pre-eliminación
    await this.preDeleteNotificacion(id, empresaId);

    // 3. Ejecutar eliminación
    await this.executeDelete(id);

    // 4. Post-eliminación
    await this.postDeleteNotificacion(id, empresaId);
  }

  /**
   * Template Method para marcar como leída
   */
  protected async marcarComoLeida(
    id: number,
    empresaId: number,
  ): Promise<NotificacionFormatted> {
    // 1. Validar existencia
    const notificacion =
      await this.validationService.validateNotificacionExists(id, empresaId);

    // 2. Verificar si ya está leída
    if (notificacion.estado === 'leida') {
      this.logger.warn(`Notificación ${id} ya está marcada como leída`);
    }

    // 3. Actualizar estado
    const updatedNotificacion = await this.executeUpdate(id, {
      estado: 'leida',
    });

    // 4. Post-procesamiento
    await this.postMarcarLeida(updatedNotificacion, empresaId);

    // 5. Formatear respuesta
    return await this.formatNotificacionResponse(id, empresaId);
  }

  // Métodos abstractos que deben implementar las clases hijas
  protected abstract preCreateValidation(
    createDto: CreateNotificacionDto,
    empresaId: number,
    clienteId: number,
  ): Promise<void>;

  protected abstract postCreateNotificacion(
    notificacion: any,
    empresaId: number,
  ): Promise<void>;

  protected abstract postUpdateNotificacion(
    notificacion: any,
    empresaId: number,
  ): Promise<void>;

  protected abstract preDeleteNotificacion(
    id: number,
    empresaId: number,
  ): Promise<void>;

  protected abstract postDeleteNotificacion(
    id: number,
    empresaId: number,
  ): Promise<void>;

  protected abstract postMarcarLeida(
    notificacion: any,
    empresaId: number,
  ): Promise<void>;

  // Métodos concretos reutilizables

  /**
   * Preparar datos de notificación para creación
   */
  protected async prepareNotificacionData(
    createDto: CreateNotificacionDto,
    clienteId: number,
  ): Promise<any> {
    return {
      mensaje: createDto.contenido,
      id_cliente: clienteId,
      estado: createDto.estado || 'pendiente',
    };
  }

  /**
   * Preparar datos para actualización
   */
  protected async prepareUpdateData(
    updateDto: UpdateNotificacionDto,
  ): Promise<any> {
    const updateData: any = {};

    if (updateDto.contenido !== undefined) {
      updateData.mensaje = updateDto.contenido;
    }

    if (updateDto.estado !== undefined) {
      updateData.estado = updateDto.estado;
    }

    return updateData;
  }

  /**
   * Construir cláusula WHERE para consultas
   */
  protected async buildWhereClause(
    empresaId: number,
    filters: any,
  ): Promise<any> {
    // Obtener clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const whereClause: any = {
      id_cliente: { in: clienteIds },
    };

    // Aplicar filtros específicos
    if (filters.estado) {
      whereClause.estado = filters.estado;
    }

    if (filters.cliente_id) {
      whereClause.id_cliente = filters.cliente_id;
    }

    if (filters.fecha_desde) {
      whereClause.fecha_notificacion = {
        ...whereClause.fecha_notificacion,
        gte: new Date(filters.fecha_desde),
      };
    }

    if (filters.fecha_hasta) {
      whereClause.fecha_notificacion = {
        ...whereClause.fecha_notificacion,
        lte: new Date(filters.fecha_hasta),
      };
    }

    if (filters.buscar_mensaje) {
      whereClause.mensaje = {
        contains: filters.buscar_mensaje,
        mode: 'insensitive',
      };
    }

    return whereClause;
  }

  /**
   * Ejecutar consulta paginada
   */
  protected async executeQuery(
    whereClause: any,
    page: number,
    limit: number,
  ): Promise<any[]> {
    return await this.prisma.notificacion.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            email: true,
          },
        },
        feedback: {
          select: {
            id_feedback: true,
            comentario: true,
            fecha_feedback: true,
          },
        },
      },
      orderBy: {
        fecha_notificacion: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Ejecutar conteo
   */
  protected async executeCount(whereClause: any): Promise<number> {
    return await this.prisma.notificacion.count({
      where: whereClause,
    });
  }

  /**
   * Ejecutar creación
   */
  protected async executeCreate(data: any): Promise<any> {
    return await this.prisma.notificacion.create({
      data,
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
  }

  /**
   * Ejecutar actualización
   */
  protected async executeUpdate(id: number, data: any): Promise<any> {
    return await this.prisma.notificacion.update({
      where: { id_notificacion: id },
      data,
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
  }

  /**
   * Ejecutar eliminación
   */
  protected async executeDelete(id: number): Promise<void> {
    await this.prisma.notificacion.delete({
      where: { id_notificacion: id },
    });
  }

  /**
   * Formatear respuesta de notificación individual
   */
  protected async formatNotificacionResponse(
    id: number,
    empresaId: number,
  ): Promise<NotificacionFormatted> {
    const notificacion = await this.prisma.notificacion.findFirst({
      where: {
        id_notificacion: id,
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
        feedback: true,
      },
    });

    if (!notificacion) {
      throw new Error(`Notificación ${id} no encontrada`);
    }

    return this.formatNotificacionItem(notificacion);
  }

  /**
   * Formatear item de notificación
   */
  protected formatNotificacionItem(notificacion: any): NotificacionFormatted {
    return {
      id_notificacion: notificacion.id_notificacion,
      mensaje: notificacion.mensaje,
      estado: notificacion.estado,
      fecha_notificacion: notificacion.fecha_notificacion.toISOString(),
      cliente: {
        id_cliente: notificacion.cliente.id_cliente,
        nombre: notificacion.cliente.nombre,
        email: notificacion.cliente.email,
      },
      feedback_count: notificacion.feedback?.length || 0,
      es_leida: notificacion.estado === 'leida',
    };
  }
}
