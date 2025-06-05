import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';
import {
  ModerarValoracionDto,
  EstadoModeracion,
} from '../dto/moderar-valoracion.dto';
import { PaginationDto } from '../dto/pagination.dto';
import {
  BaseValoracionesService,
  ValoracionFormatted,
  PaginatedValoraciones,
} from './base-valoraciones.service';
import { ValoracionesValidationService } from './valoraciones-validation.service';
import {
  ValoracionesCalculationService,
  MetricasValoraciones,
  EstadisticasProducto,
} from './valoraciones-calculation.service';

@Injectable()
export class ValoracionesService extends BaseValoracionesService {
  protected readonly logger = new Logger(ValoracionesService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: ValoracionesValidationService,
    protected readonly calculationService: ValoracionesCalculationService,
  ) {
    super(prisma, validationService, calculationService);
  }

  /**
   * Crear nueva valoración
   */
  async create(
    empresaId: number,
    createValoracionDto: CreateValoracionDto,
  ): Promise<ValoracionFormatted> {
    return await this.createValoracion(createValoracionDto, empresaId);
  }

  /**
   * Obtener valoraciones paginadas con filtros
   */
  async findAll(
    empresaId: number,
    paginationDto: PaginationDto,
    filters: any = {},
  ): Promise<PaginatedValoraciones> {
    const { page = 1, limit = 10 } = paginationDto;
    return await this.getValoraciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener una valoración específica
   */
  async findOne(id: number, empresaId: number): Promise<ValoracionFormatted> {
    return await this.formatValoracionResponse(id, empresaId);
  }

  /**
   * Actualizar valoración
   */
  async update(
    id: number,
    empresaId: number,
    updateValoracionDto: UpdateValoracionDto,
  ): Promise<ValoracionFormatted> {
    return await this.updateValoracion(id, updateValoracionDto, empresaId);
  }

  /**
   * Eliminar valoración
   */
  async remove(id: number, empresaId: number): Promise<void> {
    await this.deleteValoracion(id, empresaId);
  }

  /**
   * Moderar valoración
   */
  async moderar(
    id: number,
    empresaId: number,
    moderarValoracionDto: ModerarValoracionDto,
  ): Promise<ValoracionFormatted> {
    return await super.moderarValoracion(id, moderarValoracionDto, empresaId);
  }

  /**
   * Obtener valoraciones por producto
   */
  async findByProducto(
    productoId: number,
    empresaId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedValoraciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = { id_producto: productoId };
    return await this.getValoraciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener valoraciones por cliente
   */
  async findByCliente(
    clienteId: number,
    empresaId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedValoraciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = { id_cliente: clienteId };
    return await this.getValoraciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener métricas generales de valoraciones
   */
  async getMetricasGenerales(empresaId: number): Promise<MetricasValoraciones> {
    return await this.calculationService.calculateMetricasGenerales(empresaId);
  }

  /**
   * Obtener estadísticas específicas de un producto
   */
  async getEstadisticasProducto(
    productoId: number,
    empresaId: number,
  ): Promise<EstadisticasProducto> {
    // Validar que el producto pertenece a la empresa
    await this.validationService.validateProductoEmpresa(productoId, empresaId);

    return await this.calculationService.calculateEstadisticasProducto(
      productoId,
      empresaId,
    );
  }

  /**
   * Obtener valoraciones pendientes de moderación
   */
  async getValoracionesPendientes(
    empresaId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedValoraciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = { estado_moderacion: 'PENDIENTE' };
    return await this.getValoraciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener valoraciones por rango de puntuación
   */
  async getValoracionesPorPuntuacion(
    empresaId: number,
    puntuacionMinima: number,
    puntuacionMaxima: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedValoraciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = {
      puntuacion_minima: puntuacionMinima,
      puntuacion_maxima: puntuacionMaxima,
    };
    return await this.getValoraciones(empresaId, page, limit, filters);
  }

  /**
   * Buscar valoraciones por comentario
   */
  async buscarPorComentario(
    empresaId: number,
    termino: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedValoraciones> {
    const { page = 1, limit = 10 } = paginationDto;
    const filters = { buscar_comentario: termino };
    return await this.getValoraciones(empresaId, page, limit, filters);
  }

  /**
   * Aprobar múltiples valoraciones
   */
  async aprobarMultiples(
    empresaId: number,
    valoracionIds: number[],
    comentarioModerador?: string,
  ): Promise<ValoracionFormatted[]> {
    const resultados: ValoracionFormatted[] = [];

    for (const valoracionId of valoracionIds) {
      try {
        const moderarDto: ModerarValoracionDto = {
          estado: EstadoModeracion.APROBADO,
          comentario_moderador: comentarioModerador,
        };

        const valoracion = await this.moderarValoracion(
          valoracionId,
          moderarDto,
          empresaId,
        );
        resultados.push(valoracion);
      } catch (error) {
        this.logger.warn(
          `Error al aprobar valoración ${valoracionId}: ${error.message}`,
        );
      }
    }

    return resultados;
  }

  /**
   * Rechazar múltiples valoraciones
   */
  async rechazarMultiples(
    empresaId: number,
    valoracionIds: number[],
    comentarioModerador: string,
  ): Promise<ValoracionFormatted[]> {
    const resultados: ValoracionFormatted[] = [];

    for (const valoracionId of valoracionIds) {
      try {
        const moderarDto: ModerarValoracionDto = {
          estado: EstadoModeracion.RECHAZADO,
          comentario_moderador: comentarioModerador,
        };

        const valoracion = await this.moderarValoracion(
          valoracionId,
          moderarDto,
          empresaId,
        );
        resultados.push(valoracion);
      } catch (error) {
        this.logger.warn(
          `Error al rechazar valoración ${valoracionId}: ${error.message}`,
        );
      }
    }

    return resultados;
  }

  /**
   * Obtener resumen para dashboard
   */
  async getResumenDashboard(empresaId: number): Promise<any> {
    const [metricas, pendientes] = await Promise.all([
      this.getMetricasGenerales(empresaId),
      this.getValoracionesPendientes(empresaId, { page: 1, limit: 5 }),
    ]);

    return {
      metricas_generales: metricas,
      valoraciones_pendientes: pendientes.data,
      alertas: {
        valoraciones_pendientes: pendientes.meta.total,
        promedio_bajo: metricas.promedio_calificacion < 3,
        necesita_atencion: pendientes.meta.total > 10,
      },
    };
  }

  /**
   * Verificar si un cliente puede valorar un producto
   */
  async puedeValorar(
    clienteId: number,
    productoId: number,
    empresaId: number,
  ): Promise<{
    puede_valorar: boolean;
    razon?: string;
    es_compra_verificada: boolean;
  }> {
    try {
      // Validar relaciones
      await Promise.all([
        this.validationService.validateClienteEmpresa(clienteId, empresaId),
        this.validationService.validateProductoEmpresa(productoId, empresaId),
      ]);

      // Verificar si ya valoró
      await this.validationService.validateValoracionUnica(
        clienteId,
        productoId,
      );

      // Verificar compra
      const esCompraVerificada =
        await this.validationService.validateClienteComproProducto(
          clienteId,
          productoId,
        );

      return {
        puede_valorar: true,
        es_compra_verificada: esCompraVerificada,
      };
    } catch (error) {
      return {
        puede_valorar: false,
        razon: error.message,
        es_compra_verificada: false,
      };
    }
  }

  // Hooks específicos del servicio

  protected async postCreateValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    await super.postCreateValoracion(valoracion, empresaId);

    // Lógica específica adicional
    this.logger.log(
      `Nueva valoración creada: ${valoracion.id_valoracion} para empresa ${empresaId}`,
    );

    // Aquí se podrían agregar notificaciones, actualizaciones de métricas, etc.
  }

  protected async postModerarValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    await super.postModerarValoracion(valoracion, empresaId);

    // Lógica específica adicional
    this.logger.log(
      `Valoración moderada: ${valoracion.id_valoracion} - Estado: ${valoracion.estado_moderacion}`,
    );

    // Aquí se podrían agregar notificaciones al cliente, actualizaciones de métricas, etc.
  }
}
