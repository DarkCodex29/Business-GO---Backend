import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportesValidationService } from './reportes-validation.service';
import { ReportesCalculationService } from './reportes-calculation.service';
import { TipoReporte, FormatoReporte } from '../dto/create-reporte.dto';

export interface IReporteQuery {
  empresaId: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  tipoReporte?: string;
  formato?: string;
  parametros?: any;
  page?: number;
  limit?: number;
}

export interface IReporteResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metricas?: any;
  configuracion?: {
    moneda: string;
    zona_horaria: string;
    formato_fecha: string;
    igv_rate: number;
  };
}

export interface IReporteEjecucion {
  id_ejecucion: number;
  estado: string;
  fecha_inicio: Date;
  fecha_fin?: Date;
  resultado?: any;
  error?: string;
  parametros?: any;
}

@Injectable()
export abstract class BaseReportesService {
  protected readonly logger = new Logger(BaseReportesService.name);

  // Configuración para contexto peruano
  protected readonly CONFIG_PERU = {
    MONEDA: 'PEN',
    ZONA_HORARIA: 'America/Lima',
    FORMATO_FECHA: 'dd/MM/yyyy',
    IGV_RATE: 0.18,
    DECIMALES_MONEDA: 2,
    MAX_REGISTROS_REPORTE: 10000,
    TIMEOUT_REPORTE: 300000, // 5 minutos
  };

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly reportesValidationService: ReportesValidationService,
    protected readonly reportesCalculationService: ReportesCalculationService,
  ) {}

  // Template Method: Algoritmo general para generar reportes
  async generateReporte<T>(
    query: IReporteQuery,
    usuarioId: number,
    tipoReporte: TipoReporte,
  ): Promise<IReporteResponse<T>> {
    this.logger.log(
      `Iniciando generación de reporte ${tipoReporte} para empresa ${query.empresaId}`,
    );

    try {
      // Paso 1: Validaciones previas
      await this.validateReporteRequest(query, usuarioId, tipoReporte);

      // Paso 2: Preparar configuración
      const configuracion = await this.prepareReporteConfiguration(
        query.empresaId,
      );

      // Paso 3: Ejecutar consulta específica (método abstracto)
      const data = await this.executeReporteQuery(query);

      // Paso 4: Calcular métricas específicas (método abstracto)
      const metricas = await this.calculateReporteMetrics(query);

      // Paso 5: Aplicar formateo específico para Perú
      const dataFormateada = this.formatReporteData(data, configuracion);

      // Paso 6: Construir metadata de paginación
      const metadata = await this.buildReporteMetadata(query);

      // Paso 7: Registrar ejecución exitosa
      await this.logReporteExecution(query, usuarioId, 'completado', {
        registros: data.length,
        metricas,
      });

      this.logger.log(
        `Reporte ${tipoReporte} generado exitosamente: ${data.length} registros`,
      );

      return {
        data: dataFormateada,
        metadata,
        metricas,
        configuracion,
      };
    } catch (error) {
      // Registrar error
      await this.logReporteExecution(
        query,
        usuarioId,
        'error',
        null,
        error.message,
      );
      this.logger.error(
        `Error generando reporte ${tipoReporte}: ${error.message}`,
      );
      throw error;
    }
  }

  // Template Method: Algoritmo para ejecutar reporte programado
  async executeScheduledReporte(
    reporteId: number,
    usuarioId: number,
  ): Promise<any> {
    this.logger.log(`Ejecutando reporte programado ${reporteId}`);

    const reporte = await this.findReporteById(reporteId);

    // Validar que el reporte esté activo
    if (!reporte.activo) {
      throw new NotFoundException(`Reporte ${reporteId} no está activo`);
    }

    // Crear registro de ejecución
    const ejecucion = await this.createEjecucionReporte(reporteId, usuarioId);

    try {
      // Preparar query desde parámetros del reporte
      const query: IReporteQuery = {
        empresaId: reporte.id_empresa,
        tipoReporte: reporte.tipo_reporte,
        formato: reporte.formato,
        parametros: reporte.parametros,
        ...this.parseReporteParameters(reporte.parametros),
      };

      // Generar reporte usando template method
      const resultado = await this.generateReporte(
        query,
        usuarioId,
        reporte.tipo_reporte as TipoReporte,
      );

      // Actualizar ejecución como completada
      await this.updateEjecucionReporte(
        ejecucion.id_ejecucion,
        'completado',
        resultado,
      );

      // Actualizar última ejecución del reporte
      await this.updateLastExecution(reporteId);

      return { mensaje: 'Reporte ejecutado exitosamente', resultado };
    } catch (error) {
      // Actualizar ejecución como error
      await this.updateEjecucionReporte(
        ejecucion.id_ejecucion,
        'error',
        null,
        error.message,
      );
      throw error;
    }
  }

  // Template Method: Algoritmo para obtener historial de reportes
  async getReportesHistory(
    empresaId: number,
    tipoReporte?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<IReporteResponse<any>> {
    await this.reportesValidationService.validateEmpresaExists(empresaId);

    const skip = (page - 1) * limit;
    const whereClause: any = { id_empresa: empresaId };

    if (tipoReporte) {
      whereClause.tipo_reporte = tipoReporte;
    }

    const [reportes, total] = await Promise.all([
      this.prisma.reporte.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: {
          usuario: { select: { nombre: true, email: true } },
          ejecuciones: {
            orderBy: { fecha_inicio: 'desc' },
            take: 3,
            select: {
              id_ejecucion: true,
              estado: true,
              fecha_inicio: true,
              fecha_fin: true,
            },
          },
        },
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.reporte.count({ where: whereClause }),
    ]);

    const metadata = this.buildPaginationMetadata(total, page, limit);

    return { data: reportes, metadata };
  }

  // Métodos auxiliares protegidos

  protected async validateReporteRequest(
    query: IReporteQuery,
    usuarioId: number,
    tipoReporte: TipoReporte,
  ): Promise<void> {
    // Validaciones usando el servicio especializado
    await this.reportesValidationService.validateEmpresaExists(query.empresaId);
    await this.reportesValidationService.validateUsuarioEmpresa(
      usuarioId,
      query.empresaId,
    );
    this.reportesValidationService.validateTipoReporte(tipoReporte);
    this.reportesValidationService.validateFechasReporte(
      query.fechaInicio,
      query.fechaFin,
    );
    this.reportesValidationService.validateParametrosReporte(
      tipoReporte,
      query.parametros,
    );
    await this.reportesValidationService.validateLimitesReporte(
      query.empresaId,
      tipoReporte,
    );

    if (query.formato) {
      this.reportesValidationService.validateFormatoReporte(query.formato);
    }

    await this.reportesValidationService.validatePermisoReporte(
      usuarioId,
      query.empresaId,
      tipoReporte,
    );
  }

  protected async prepareReporteConfiguration(empresaId: number): Promise<any> {
    // Obtener configuración regional de la empresa
    const configuracionRegional =
      await this.prisma.configuracionRegional.findUnique({
        where: { id_empresa: empresaId },
      });

    const configuracionImpuestos =
      await this.prisma.configuracionImpuestos.findUnique({
        where: { id_empresa: empresaId },
      });

    const configuracionMoneda =
      await this.prisma.configuracionMoneda.findUnique({
        where: { id_empresa: empresaId },
      });

    return {
      moneda: configuracionMoneda?.moneda_principal || this.CONFIG_PERU.MONEDA,
      zona_horaria:
        configuracionRegional?.zona_horaria || this.CONFIG_PERU.ZONA_HORARIA,
      formato_fecha:
        configuracionRegional?.formato_fecha || this.CONFIG_PERU.FORMATO_FECHA,
      igv_rate:
        configuracionImpuestos?.tasa_igv?.toNumber() ||
        this.CONFIG_PERU.IGV_RATE,
      decimales_moneda: this.CONFIG_PERU.DECIMALES_MONEDA,
    };
  }

  protected formatReporteData(data: any[], configuracion: any): any[] {
    return data.map((item) => {
      // Formatear campos monetarios
      if (item.total) {
        item.total_formateado = this.formatCurrency(item.total, configuracion);
      }
      if (item.subtotal) {
        item.subtotal_formateado = this.formatCurrency(
          item.subtotal,
          configuracion,
        );
      }
      if (item.igv) {
        item.igv_formateado = this.formatCurrency(item.igv, configuracion);
      }

      // Formatear fechas
      if (item.fecha_emision) {
        item.fecha_emision_formateada = this.formatDate(
          item.fecha_emision,
          configuracion,
        );
      }
      if (item.fecha_entrega) {
        item.fecha_entrega_formateada = this.formatDate(
          item.fecha_entrega,
          configuracion,
        );
      }

      return item;
    });
  }

  protected formatCurrency(amount: any, configuracion: any): string {
    const valor =
      typeof amount === 'object' ? amount.toNumber() : Number(amount);
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: configuracion.moneda,
      minimumFractionDigits: configuracion.decimales_moneda,
    }).format(valor);
  }

  protected formatDate(date: Date, configuracion: any): string {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: configuracion.zona_horaria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  }

  protected async buildReporteMetadata(query: IReporteQuery): Promise<any> {
    const total = await this.countReporteRecords(query);
    const page = query.page || 1;
    const limit = Math.min(
      query.limit || 50,
      this.CONFIG_PERU.MAX_REGISTROS_REPORTE,
    );

    return this.buildPaginationMetadata(total, page, limit);
  }

  protected buildPaginationMetadata(
    total: number,
    page: number,
    limit: number,
  ): any {
    const totalPages = Math.ceil(total / limit);

    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  protected async logReporteExecution(
    query: IReporteQuery,
    usuarioId: number,
    estado: string,
    resultado?: any,
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.ejecucionReporte.create({
        data: {
          reporte: {
            connect: { id_reporte: query.empresaId }, // Temporal, necesita ID real del reporte
          },
          usuario: {
            connect: { id_usuario: usuarioId },
          },
          estado,
          fecha_inicio: new Date(),
          fecha_fin: estado !== 'en_proceso' ? new Date() : null,
          resultado: resultado ? JSON.stringify(resultado) : null,
          error,
          parametros: query.parametros
            ? JSON.stringify(query.parametros)
            : undefined,
        },
      });
    } catch (logError) {
      this.logger.error(
        `Error registrando ejecución de reporte: ${logError.message}`,
      );
    }
  }

  protected parseReporteParameters(parametros: any): Partial<IReporteQuery> {
    if (!parametros) return {};

    const parsed: Partial<IReporteQuery> = {};

    if (parametros.fecha_inicio) {
      parsed.fechaInicio = new Date(parametros.fecha_inicio);
    }
    if (parametros.fecha_fin) {
      parsed.fechaFin = new Date(parametros.fecha_fin);
    }

    return parsed;
  }

  // Métodos auxiliares privados

  private async findReporteById(reporteId: number): Promise<any> {
    const reporte = await this.prisma.reporte.findUnique({
      where: { id_reporte: reporteId },
      include: {
        empresa: { select: { nombre: true, estado: true } },
        usuario: { select: { nombre: true, email: true } },
      },
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${reporteId} no encontrado`);
    }

    return reporte;
  }

  private async createEjecucionReporte(
    reporteId: number,
    usuarioId: number,
  ): Promise<any> {
    return this.prisma.ejecucionReporte.create({
      data: {
        id_reporte: reporteId,
        id_usuario: usuarioId,
        estado: 'en_proceso',
        fecha_inicio: new Date(),
      },
    });
  }

  private async updateEjecucionReporte(
    ejecucionId: number,
    estado: string,
    resultado?: any,
    error?: string,
  ): Promise<void> {
    await this.prisma.ejecucionReporte.update({
      where: { id_ejecucion: ejecucionId },
      data: {
        estado,
        fecha_fin: new Date(),
        resultado: resultado ? JSON.stringify(resultado) : null,
        error,
      },
    });
  }

  private async updateLastExecution(reporteId: number): Promise<void> {
    await this.prisma.reporte.update({
      where: { id_reporte: reporteId },
      data: { ultima_ejecucion: new Date() },
    });
  }

  // Métodos abstractos que deben implementar las clases hijas

  protected abstract executeReporteQuery(query: IReporteQuery): Promise<any[]>;
  protected abstract calculateReporteMetrics(
    query: IReporteQuery,
  ): Promise<any>;
  protected abstract countReporteRecords(query: IReporteQuery): Promise<number>;

  // Métodos opcionales que pueden sobrescribir las clases hijas

  protected validateSpecificParameters(parametros: any): void {
    // Implementación por defecto vacía
    // Las clases hijas pueden sobrescribir para validaciones específicas
  }

  protected formatSpecificData(data: any[], configuracion: any): any[] {
    // Implementación por defecto que retorna los datos sin cambios
    // Las clases hijas pueden sobrescribir para formateo específico
    return data;
  }

  protected async calculateSpecificMetrics(query: IReporteQuery): Promise<any> {
    // Implementación por defecto vacía
    // Las clases hijas pueden sobrescribir para métricas específicas
    return {};
  }

  // Métodos utilitarios para las clases hijas

  protected buildDateRangeClause(fechaInicio?: Date, fechaFin?: Date): any {
    if (!fechaInicio && !fechaFin) return {};

    const dateClause: any = {};
    if (fechaInicio) dateClause.gte = fechaInicio;
    if (fechaFin) dateClause.lte = fechaFin;

    return { fecha_emision: dateClause };
  }

  protected buildPaginationClause(
    page?: number,
    limit?: number,
  ): { skip: number; take: number } {
    const actualPage = page || 1;
    const actualLimit = Math.min(
      limit || 50,
      this.CONFIG_PERU.MAX_REGISTROS_REPORTE,
    );

    return {
      skip: (actualPage - 1) * actualLimit,
      take: actualLimit,
    };
  }

  protected async getEmpresaConfiguration(empresaId: number): Promise<any> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
      include: {
        configuracionRegional: true,
        configuracionImpuestos: true,
        configuracionMoneda: true,
      },
    });

    return empresa;
  }
}
