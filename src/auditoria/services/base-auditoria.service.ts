import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditoriaFormatted,
  PaginatedAuditoriaResponse,
  AuditoriaStats,
  AuditoriaFilters,
  AuditoriaContext,
  AuditoriaExportOptions,
  IAuditoriaService,
} from '../interfaces/auditoria.interface';
import {
  CreateAuditoriaDto,
  TipoAccion,
  TipoRecurso,
  NivelSeveridad,
} from '../dto';

/**
 * Servicio base abstracto para auditoría
 * Implementa Template Method Pattern para operaciones de auditoría
 * Principios SOLID aplicados:
 * - Single Responsibility: Manejo de auditoría
 * - Open/Closed: Extensible mediante herencia
 * - Liskov Substitution: Implementaciones intercambiables
 * - Interface Segregation: Interfaces específicas
 * - Dependency Inversion: Depende de abstracciones
 */
@Injectable()
export abstract class BaseAuditoriaService implements IAuditoriaService {
  protected readonly logger = new Logger(BaseAuditoriaService.name);

  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Template Method: Registrar evento de auditoría
   * Define el algoritmo general, delegando pasos específicos a subclases
   */
  async registrarEvento(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<AuditoriaFormatted> {
    try {
      // 1. Validar datos de entrada
      await this.validarDatosEvento(data, context);

      // 2. Enriquecer datos con contexto
      const datosEnriquecidos = await this.enriquecerDatos(data, context);

      // 3. Aplicar reglas de negocio específicas
      await this.aplicarReglasNegocio(datosEnriquecidos, context);

      // 4. Persistir evento
      const eventoCreado = await this.persistirEvento(datosEnriquecidos);

      // 5. Post-procesamiento
      await this.postProcesarEvento(eventoCreado, context);

      // 6. Formatear respuesta
      return this.formatearEvento(eventoCreado);
    } catch (error) {
      this.logger.error(
        `Error registrando evento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Template Method: Obtener eventos con filtros y paginación
   */
  async obtenerEventos(
    empresaId: string,
    page: number = 1,
    limit: number = 10,
    filtros?: AuditoriaFilters,
  ): Promise<PaginatedAuditoriaResponse> {
    try {
      // 1. Validar parámetros
      await this.validarParametrosConsulta(empresaId, page, limit, filtros);

      // 2. Construir query base
      const queryBase = await this.construirQueryBase(empresaId);

      // 3. Aplicar filtros
      const queryConFiltros = await this.aplicarFiltros(queryBase, filtros);

      // 4. Aplicar paginación
      const queryFinal = await this.aplicarPaginacion(
        queryConFiltros,
        page,
        limit,
      );

      // 5. Ejecutar consulta
      const [eventos, total] = await this.ejecutarConsulta(queryFinal);

      // 6. Formatear resultados
      const eventosFormateados = await this.formatearEventos(eventos);

      // 7. Construir respuesta paginada
      return this.construirRespuestaPaginada(
        eventosFormateados,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Error obteniendo eventos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Template Method: Obtener estadísticas de auditoría
   */
  async obtenerEstadisticas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<AuditoriaStats> {
    try {
      // 1. Validar parámetros
      await this.validarParametrosEstadisticas(
        empresaId,
        fechaInicio,
        fechaFin,
      );

      // 2. Calcular estadísticas básicas
      const estadisticasBasicas = await this.calcularEstadisticasBasicas(
        empresaId,
        fechaInicio,
        fechaFin,
      );

      // 3. Calcular estadísticas por dimensión
      const estadisticasPorDimension =
        await this.calcularEstadisticasPorDimension(
          empresaId,
          fechaInicio,
          fechaFin,
        );

      // 4. Calcular tendencias
      const tendencias = await this.calcularTendencias(
        empresaId,
        fechaInicio,
        fechaFin,
      );

      // 5. Combinar resultados
      return this.combinarEstadisticas(
        estadisticasBasicas,
        estadisticasPorDimension,
        tendencias,
      );
    } catch (error) {
      this.logger.error(
        `Error obteniendo estadísticas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Métodos abstractos que deben implementar las subclases
  protected abstract validarDatosEvento(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<void>;

  protected abstract enriquecerDatos(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<any>;

  protected abstract aplicarReglasNegocio(
    data: any,
    context: AuditoriaContext,
  ): Promise<void>;

  protected abstract persistirEvento(data: any): Promise<any>;

  protected abstract postProcesarEvento(
    evento: any,
    context: AuditoriaContext,
  ): Promise<void>;

  protected abstract formatearEvento(evento: any): AuditoriaFormatted;

  protected abstract validarParametrosConsulta(
    empresaId: string,
    page: number,
    limit: number,
    filtros?: AuditoriaFilters,
  ): Promise<void>;

  protected abstract construirQueryBase(empresaId: string): Promise<any>;

  protected abstract aplicarFiltros(
    query: any,
    filtros?: AuditoriaFilters,
  ): Promise<any>;

  protected abstract aplicarPaginacion(
    query: any,
    page: number,
    limit: number,
  ): Promise<any>;

  protected abstract ejecutarConsulta(query: any): Promise<[any[], number]>;

  protected abstract formatearEventos(
    eventos: any[],
  ): Promise<AuditoriaFormatted[]>;

  protected abstract construirRespuestaPaginada(
    eventos: AuditoriaFormatted[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAuditoriaResponse;

  protected abstract validarParametrosEstadisticas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<void>;

  protected abstract calcularEstadisticasBasicas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any>;

  protected abstract calcularEstadisticasPorDimension(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any>;

  protected abstract calcularTendencias(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any>;

  protected abstract combinarEstadisticas(
    basicas: any,
    porDimension: any,
    tendencias: any,
  ): AuditoriaStats;

  // Métodos abstractos adicionales para completar la interfaz
  abstract obtenerEventoPorId(
    id: string,
    empresaId: string,
  ): Promise<AuditoriaFormatted | null>;
  abstract exportarEventos(
    empresaId: string,
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer>;
  abstract limpiarEventosAntiguos(diasRetencion: number): Promise<number>;
  abstract validarAcceso(
    usuarioId: string,
    empresaId: string,
  ): Promise<boolean>;

  /**
   * Método helper para logging de eventos críticos
   */
  protected logEventoCritico(evento: AuditoriaFormatted): void {
    if (
      evento.severidad === NivelSeveridad.CRITICAL ||
      evento.severidad === NivelSeveridad.ERROR
    ) {
      this.logger.warn(
        `Evento crítico registrado: ${evento.accion} en ${evento.recurso} por usuario ${evento.usuario_id}`,
        {
          eventoId: evento.id,
          accion: evento.accion,
          recurso: evento.recurso,
          severidad: evento.severidad,
          usuarioId: evento.usuario_id,
          empresaId: evento.empresa_id,
        },
      );
    }
  }

  /**
   * Método helper para validar fechas
   */
  protected validarRangoFechas(fechaInicio?: string, fechaFin?: string): void {
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      if (inicio > fin) {
        throw new Error(
          'La fecha de inicio no puede ser mayor a la fecha de fin',
        );
      }

      const diferenciaDias =
        (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
      if (diferenciaDias > 365) {
        throw new Error('El rango de fechas no puede ser mayor a 365 días');
      }
    }
  }

  /**
   * Método helper para sanitizar datos sensibles
   */
  protected sanitizarDatosSensibles(datos: any): any {
    if (!datos || typeof datos !== 'object') {
      return datos;
    }

    const datosSanitizados = { ...datos };
    const camposSensibles = [
      'password',
      'token',
      'secret',
      'key',
      'credential',
    ];

    for (const campo of camposSensibles) {
      if (datosSanitizados[campo]) {
        datosSanitizados[campo] = '***REDACTED***';
      }
    }

    return datosSanitizados;
  }
}
