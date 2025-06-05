import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { BaseAuditoriaService } from './services/base-auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditoriaFormatted,
  PaginatedAuditoriaResponse,
  AuditoriaStats,
  AuditoriaFilters,
  AuditoriaContext,
  AuditoriaExportOptions,
} from './interfaces/auditoria.interface';
import {
  CreateAuditoriaDto,
  TipoAccion,
  TipoRecurso,
  NivelSeveridad,
} from './dto';
import * as ExcelJS from 'exceljs';

/**
 * Servicio principal de auditoría
 * Implementa BaseAuditoriaService con lógica específica de negocio
 * Principios SOLID aplicados:
 * - Single Responsibility: Gestión completa de auditoría
 * - Open/Closed: Extensible sin modificar código base
 * - Liskov Substitution: Sustituible por otras implementaciones
 * - Interface Segregation: Implementa interfaces específicas
 * - Dependency Inversion: Depende de abstracciones (PrismaService)
 */
@Injectable()
export class AuditoriaService extends BaseAuditoriaService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Validar datos del evento antes de procesarlo
   */
  protected async validarDatosEvento(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<void> {
    if (!data.accion || !data.recurso || !data.descripcion) {
      throw new BadRequestException(
        'Acción, recurso y descripción son requeridos',
      );
    }

    if (!context.empresa_id) {
      throw new BadRequestException(
        'ID de empresa es requerido en el contexto',
      );
    }

    // Validar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: parseInt(context.empresa_id) },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Validar usuario si se proporciona
    if (context.usuario_id) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id_usuario: parseInt(context.usuario_id) },
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }
    }
  }

  /**
   * Enriquecer datos con información del contexto
   */
  protected async enriquecerDatos(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<any> {
    const datosEnriquecidos = {
      ...data,
      empresa_id: parseInt(context.empresa_id),
      usuario_id: context.usuario_id ? parseInt(context.usuario_id) : null,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      severidad: data.severidad || NivelSeveridad.INFO,
      datos_anteriores: this.sanitizarDatosSensibles(data.datos_anteriores),
      datos_nuevos: this.sanitizarDatosSensibles(data.datos_nuevos),
      metadata: {
        ...data.metadata,
        ...context.metadata,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return datosEnriquecidos;
  }

  /**
   * Aplicar reglas de negocio específicas
   */
  protected async aplicarReglasNegocio(
    data: any,
    context: AuditoriaContext,
  ): Promise<void> {
    // Regla: Eventos críticos requieren más información
    if (data.severidad === NivelSeveridad.CRITICAL) {
      if (!data.datos_anteriores && !data.datos_nuevos) {
        throw new BadRequestException(
          'Eventos críticos requieren datos anteriores o nuevos para contexto',
        );
      }
    }

    // Regla: Acciones de eliminación requieren datos anteriores
    if (data.accion === TipoAccion.ELIMINAR && !data.datos_anteriores) {
      this.logger.warn(
        `Eliminación sin datos anteriores: ${data.recurso} ${data.recurso_id}`,
      );
    }

    // Regla: Limitar eventos por usuario por minuto (anti-spam)
    if (context.usuario_id) {
      const unMinutoAtras = new Date(Date.now() - 60 * 1000);
      const eventosRecientes = await this.prisma.auditoria.count({
        where: {
          usuario_id: context.usuario_id ? parseInt(context.usuario_id) : null,
          fecha_evento: {
            gte: unMinutoAtras,
          },
        },
      });

      if (eventosRecientes > 100) {
        throw new BadRequestException(
          'Demasiados eventos de auditoría en poco tiempo. Intente más tarde.',
        );
      }
    }
  }

  /**
   * Persistir evento en la base de datos
   */
  protected async persistirEvento(data: any): Promise<any> {
    return await this.prisma.auditoria.create({
      data: {
        accion: data.accion,
        recurso: data.recurso,
        recurso_id: data.recurso_id,
        descripcion: data.descripcion,
        severidad: data.severidad,
        datos_anteriores: data.datos_anteriores,
        datos_nuevos: data.datos_nuevos,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        metadatos: data.metadata,
        empresa_id: data.empresa_id,
        usuario_id: data.usuario_id,
      },
      include: {
        empresa: {
          select: {
            nombre: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Post-procesamiento del evento
   */
  protected async postProcesarEvento(
    evento: any,
    context: AuditoriaContext,
  ): Promise<void> {
    // Log eventos críticos
    const eventoFormateado = this.formatearEvento(evento);
    this.logEventoCritico(eventoFormateado);

    // Notificar eventos críticos (implementar según necesidades)
    if (evento.severidad === NivelSeveridad.CRITICAL) {
      await this.notificarEventoCritico(eventoFormateado);
    }

    // Limpiar eventos antiguos periódicamente
    if (Math.random() < 0.01) {
      // 1% de probabilidad
      await this.limpiarEventosAntiguos(90); // 90 días de retención
    }
  }

  /**
   * Formatear evento para respuesta
   */
  protected formatearEvento(evento: any): AuditoriaFormatted {
    return {
      id: evento.id,
      accion: evento.accion,
      recurso: evento.recurso,
      recurso_id: evento.recurso_id,
      descripcion: evento.descripcion,
      severidad: evento.severidad,
      datos_anteriores: evento.datos_anteriores,
      datos_nuevos: evento.datos_nuevos,
      ip_address: evento.ip_address,
      user_agent: evento.user_agent,
      metadata: evento.metadatos,
      usuario_id: evento.usuario_id,
      usuario_nombre: evento.usuario?.nombre,
      empresa_id: evento.empresa_id,
      empresa_nombre: evento.empresa?.nombre,
      fecha_evento: evento.fecha_evento,
    };
  }

  /**
   * Validar parámetros de consulta
   */
  protected async validarParametrosConsulta(
    empresaId: string,
    page: number,
    limit: number,
    filtros?: AuditoriaFilters,
  ): Promise<void> {
    if (!empresaId) {
      throw new BadRequestException('ID de empresa es requerido');
    }

    if (page < 1) {
      throw new BadRequestException('La página debe ser mayor a 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100');
    }

    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      this.validarRangoFechas(filtros.fecha_inicio, filtros.fecha_fin);
    }
  }

  /**
   * Construir query base para consultas
   */
  protected async construirQueryBase(empresaId: string): Promise<any> {
    return {
      where: {
        empresa_id: parseInt(empresaId),
      },
      include: {
        empresa: {
          select: {
            nombre: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fecha_evento: 'desc',
      },
    };
  }

  /**
   * Aplicar filtros a la consulta
   */
  protected async aplicarFiltros(
    query: any,
    filtros?: AuditoriaFilters,
  ): Promise<any> {
    if (!filtros) return query;

    const whereConditions: any = { ...query.where };

    if (filtros.accion) {
      whereConditions.accion = filtros.accion;
    }

    if (filtros.recurso) {
      whereConditions.recurso = filtros.recurso;
    }

    if (filtros.recurso_id) {
      whereConditions.recurso_id = filtros.recurso_id;
    }

    if (filtros.usuario_id) {
      whereConditions.usuario_id = filtros.usuario_id;
    }

    if (filtros.severidad) {
      whereConditions.severidad = filtros.severidad;
    }

    if (filtros.ip_address) {
      whereConditions.ip_address = filtros.ip_address;
    }

    if (filtros.fecha_inicio || filtros.fecha_fin) {
      whereConditions.fecha_evento = {};
      if (filtros.fecha_inicio) {
        whereConditions.fecha_evento.gte = new Date(filtros.fecha_inicio);
      }
      if (filtros.fecha_fin) {
        whereConditions.fecha_evento.lte = new Date(filtros.fecha_fin);
      }
    }

    if (filtros.buscar) {
      whereConditions.descripcion = {
        contains: filtros.buscar,
        mode: 'insensitive',
      };
    }

    if (filtros.acciones && filtros.acciones.length > 0) {
      whereConditions.accion = {
        in: filtros.acciones,
      };
    }

    if (filtros.recursos && filtros.recursos.length > 0) {
      whereConditions.recurso = {
        in: filtros.recursos,
      };
    }

    if (filtros.solo_criticos) {
      whereConditions.severidad = {
        in: [NivelSeveridad.CRITICAL, NivelSeveridad.ERROR],
      };
    }

    if (filtros.excluir_lectura) {
      whereConditions.accion = {
        not: TipoAccion.LEER,
      };
    }

    return {
      ...query,
      where: whereConditions,
    };
  }

  /**
   * Aplicar paginación a la consulta
   */
  protected async aplicarPaginacion(
    query: any,
    page: number,
    limit: number,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    return {
      ...query,
      skip,
      take: limit,
    };
  }

  /**
   * Ejecutar consulta y obtener total
   */
  protected async ejecutarConsulta(query: any): Promise<[any[], number]> {
    const [eventos, total] = await Promise.all([
      this.prisma.auditoria.findMany(query),
      this.prisma.auditoria.count({ where: query.where }),
    ]);

    return [eventos, total];
  }

  /**
   * Formatear múltiples eventos
   */
  protected async formatearEventos(
    eventos: any[],
  ): Promise<AuditoriaFormatted[]> {
    return eventos.map((evento) => this.formatearEvento(evento));
  }

  /**
   * Construir respuesta paginada
   */
  protected construirRespuestaPaginada(
    eventos: AuditoriaFormatted[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAuditoriaResponse {
    const totalPages = Math.ceil(total / limit);

    return {
      data: eventos,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener evento por ID
   */
  async obtenerEventoPorId(
    id: string,
    empresaId: string,
  ): Promise<AuditoriaFormatted | null> {
    const evento = await this.prisma.auditoria.findFirst({
      where: {
        id,
        empresa_id: parseInt(empresaId),
      },
      include: {
        empresa: {
          select: {
            nombre: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
    });

    return evento ? this.formatearEvento(evento) : null;
  }

  /**
   * Validar acceso de usuario a empresa
   */
  async validarAcceso(usuarioId: string, empresaId: string): Promise<boolean> {
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: parseInt(usuarioId),
        empresa_id: parseInt(empresaId),
        estado: 'activo', // Cambiado de 'activo' a 'estado' según el schema
      },
    });

    return !!usuarioEmpresa;
  }

  /**
   * Limpiar eventos antiguos
   */
  async limpiarEventosAntiguos(diasRetencion: number): Promise<number> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

    const resultado = await this.prisma.auditoria.deleteMany({
      where: {
        fecha_evento: {
          lt: fechaLimite,
        },
        severidad: {
          not: NivelSeveridad.CRITICAL, // No eliminar eventos críticos
        },
      },
    });

    this.logger.log(
      `Eliminados ${resultado.count} eventos de auditoría antiguos`,
    );
    return resultado.count;
  }

  // Implementaciones de métodos abstractos para estadísticas
  protected async validarParametrosEstadisticas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<void> {
    if (!empresaId) {
      throw new BadRequestException('ID de empresa es requerido');
    }

    if (fechaInicio && fechaFin) {
      this.validarRangoFechas(fechaInicio, fechaFin);
    }
  }

  protected async calcularEstadisticasBasicas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any> {
    const whereCondition: any = { empresa_id: parseInt(empresaId) };

    if (fechaInicio || fechaFin) {
      whereCondition.fecha_evento = {};
      if (fechaInicio) whereCondition.fecha_evento.gte = new Date(fechaInicio);
      if (fechaFin) whereCondition.fecha_evento.lte = new Date(fechaFin);
    }

    const totalEventos = await this.prisma.auditoria.count({
      where: whereCondition,
    });

    return { total_eventos: totalEventos };
  }

  protected async calcularEstadisticasPorDimension(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any> {
    const whereCondition: any = { empresa_id: parseInt(empresaId) };

    if (fechaInicio || fechaFin) {
      whereCondition.fecha_evento = {};
      if (fechaInicio) whereCondition.fecha_evento.gte = new Date(fechaInicio);
      if (fechaFin) whereCondition.fecha_evento.lte = new Date(fechaFin);
    }

    // Estadísticas por acción
    const eventosPorAccion = await this.prisma.auditoria.groupBy({
      by: ['accion'],
      where: whereCondition,
      _count: true,
    });

    // Estadísticas por recurso
    const eventosPorRecurso = await this.prisma.auditoria.groupBy({
      by: ['recurso'],
      where: whereCondition,
      _count: true,
    });

    // Estadísticas por severidad
    const eventosPorSeveridad = await this.prisma.auditoria.groupBy({
      by: ['severidad'],
      where: whereCondition,
      _count: true,
    });

    // Estadísticas por usuario
    const eventosPorUsuario = await this.prisma.auditoria.groupBy({
      by: ['usuario_id'],
      where: {
        ...whereCondition,
        usuario_id: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          usuario_id: 'desc',
        },
      },
      take: 10,
    });

    // IPs más activas
    const ipsMasActivas = await this.prisma.auditoria.groupBy({
      by: ['ip_address'],
      where: {
        ...whereCondition,
        ip_address: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          ip_address: 'desc',
        },
      },
      take: 10,
    });

    return {
      eventos_por_accion: eventosPorAccion,
      eventos_por_recurso: eventosPorRecurso,
      eventos_por_severidad: eventosPorSeveridad,
      eventos_por_usuario: eventosPorUsuario,
      ips_mas_activas: ipsMasActivas,
    };
  }

  protected async calcularTendencias(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any> {
    // Implementar cálculo de tendencias por día
    const whereCondition: any = { empresa_id: parseInt(empresaId) };

    if (fechaInicio || fechaFin) {
      whereCondition.fecha_evento = {};
      if (fechaInicio) whereCondition.fecha_evento.gte = new Date(fechaInicio);
      if (fechaFin) whereCondition.fecha_evento.lte = new Date(fechaFin);
    }

    // Eventos por día (últimos 30 días si no se especifica rango)
    const eventos = await this.prisma.auditoria.findMany({
      where: whereCondition,
      select: {
        fecha_evento: true,
      },
    });

    const eventosPorDia: Record<string, number> = {};
    eventos.forEach((evento) => {
      const fecha = evento.fecha_evento.toISOString().split('T')[0];
      eventosPorDia[fecha] = (eventosPorDia[fecha] || 0) + 1;
    });

    return {
      eventos_por_dia: Object.entries(eventosPorDia).map(([fecha, total]) => ({
        fecha,
        total_eventos: total,
      })),
    };
  }

  protected combinarEstadisticas(
    basicas: any,
    porDimension: any,
    tendencias: any,
  ): AuditoriaStats {
    // Convertir arrays de groupBy a objetos Record
    const eventosPorAccion: Record<TipoAccion, number> = {} as Record<
      TipoAccion,
      number
    >;
    porDimension.eventos_por_accion.forEach((item: any) => {
      eventosPorAccion[item.accion as TipoAccion] = item._count;
    });

    const eventosPorRecurso: Record<TipoRecurso, number> = {} as Record<
      TipoRecurso,
      number
    >;
    porDimension.eventos_por_recurso.forEach((item: any) => {
      eventosPorRecurso[item.recurso as TipoRecurso] = item._count;
    });

    const eventosPorSeveridad: Record<NivelSeveridad, number> = {} as Record<
      NivelSeveridad,
      number
    >;
    porDimension.eventos_por_severidad.forEach((item: any) => {
      eventosPorSeveridad[item.severidad as NivelSeveridad] = item._count;
    });

    return {
      total_eventos: basicas.total_eventos,
      eventos_por_accion: eventosPorAccion,
      eventos_por_recurso: eventosPorRecurso,
      eventos_por_severidad: eventosPorSeveridad,
      eventos_por_usuario: porDimension.eventos_por_usuario.map(
        (item: any) => ({
          usuario_id: item.usuario_id,
          usuario_nombre: 'Usuario', // TODO: Obtener nombre real
          total_eventos: item._count,
        }),
      ),
      eventos_por_dia: tendencias.eventos_por_dia,
      ips_mas_activas: porDimension.ips_mas_activas.map((item: any) => ({
        ip_address: item.ip_address,
        total_eventos: item._count,
      })),
      recursos_mas_modificados: [], // TODO: Implementar
    };
  }

  /**
   * Exportar eventos (implementación básica)
   */
  async exportarEventos(
    empresaId: string,
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer> {
    const eventos = await this.obtenerEventos(
      empresaId,
      1,
      10000, // Máximo para exportación
      opciones.filtros,
    );

    if (opciones.formato === 'excel') {
      return this.exportarAExcel(eventos.data, opciones);
    }

    throw new BadRequestException('Formato de exportación no soportado');
  }

  /**
   * Exportar a Excel
   */
  private async exportarAExcel(
    eventos: AuditoriaFormatted[],
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auditoría');

    // Encabezados
    const headers = [
      'ID',
      'Fecha',
      'Acción',
      'Recurso',
      'Descripción',
      'Severidad',
      'Usuario',
      'IP',
    ];

    if (opciones.incluir_datos_cambios) {
      headers.push('Datos Anteriores', 'Datos Nuevos');
    }

    if (opciones.incluir_metadatos) {
      headers.push('Metadatos');
    }

    worksheet.addRow(headers);

    // Datos
    eventos.forEach((evento) => {
      const row: any[] = [
        evento.id,
        evento.fecha_evento,
        evento.accion,
        evento.recurso,
        evento.descripcion,
        evento.severidad,
        evento.usuario_nombre || 'Sistema',
        evento.ip_address || 'N/A',
      ];

      if (opciones.incluir_datos_cambios) {
        row.push(
          JSON.stringify(evento.datos_anteriores || {}),
          JSON.stringify(evento.datos_nuevos || {}),
        );
      }

      if (opciones.incluir_metadatos) {
        row.push(JSON.stringify(evento.metadata || {}));
      }

      worksheet.addRow(row);
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Notificar evento crítico (placeholder)
   */
  private async notificarEventoCritico(
    evento: AuditoriaFormatted,
  ): Promise<void> {
    // TODO: Implementar notificaciones (email, Slack, etc.)
    this.logger.error(`EVENTO CRÍTICO: ${evento.descripcion}`, {
      eventoId: evento.id,
      accion: evento.accion,
      recurso: evento.recurso,
      usuarioId: evento.usuario_id,
      empresaId: evento.empresa_id,
    });
  }
}
