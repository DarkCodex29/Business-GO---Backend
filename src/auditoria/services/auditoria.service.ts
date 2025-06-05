import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BaseAuditoriaService } from './base-auditoria.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditoriaFormatted,
  PaginatedAuditoriaResponse,
  AuditoriaStats,
  AuditoriaFilters,
  AuditoriaContext,
  AuditoriaExportOptions,
} from '../interfaces/auditoria.interface';
import {
  CreateAuditoriaDto,
  TipoAccion,
  TipoRecurso,
  NivelSeveridad,
} from '../dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AuditoriaService extends BaseAuditoriaService {
  private readonly EVENTOS_POR_MINUTO_LIMITE = 100;
  private readonly eventosCache = new Map<string, number>();

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // Implementación de métodos abstractos del servicio base

  protected async validarDatosEvento(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<void> {
    if (!data.accion || !data.recurso || !data.descripcion) {
      throw new BadRequestException('Datos de evento incompletos');
    }

    if (!context.empresa_id) {
      throw new BadRequestException('ID de empresa requerido');
    }

    // Validar anti-spam
    await this.validarAntiSpam(context);
  }

  protected async enriquecerDatos(
    data: CreateAuditoriaDto,
    context: AuditoriaContext,
  ): Promise<any> {
    return {
      ...data,
      empresa_id: context.empresa_id,
      usuario_id: context.usuario_id,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      severidad: data.severidad || NivelSeveridad.INFO,
      metadata: {
        ...data.metadata,
        ...context.metadata,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  protected async aplicarReglasNegocio(
    data: any,
    context: AuditoriaContext,
  ): Promise<void> {
    // Marcar eventos críticos
    if (this.esEventoCritico(data)) {
      data.severidad = NivelSeveridad.CRITICAL;
    }

    // Sanitizar datos sensibles
    if (data.datos_anteriores) {
      data.datos_anteriores = this.sanitizarDatosSensibles(
        data.datos_anteriores,
      );
    }
    if (data.datos_nuevos) {
      data.datos_nuevos = this.sanitizarDatosSensibles(data.datos_nuevos);
    }
  }

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
        usuario_id: data.usuario_id,
        empresa_id: data.empresa_id,
      },
      include: {
        usuario: {
          select: { nombre: true, email: true },
        },
        empresa: {
          select: { nombre: true },
        },
      },
    });
  }

  protected async postProcesarEvento(
    evento: any,
    context: AuditoriaContext,
  ): Promise<void> {
    // Log eventos críticos
    if (evento.severidad === NivelSeveridad.CRITICAL) {
      this.logEventoCritico(this.formatearEvento(evento));
    }

    // Notificar eventos importantes (implementar según necesidades)
    if (this.requiereNotificacion(evento)) {
      await this.notificarEvento(evento);
    }
  }

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

  protected async validarParametrosConsulta(
    empresaId: string,
    page: number,
    limit: number,
    filtros?: AuditoriaFilters,
  ): Promise<void> {
    if (!empresaId) {
      throw new BadRequestException('ID de empresa requerido');
    }

    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Parámetros de paginación inválidos');
    }

    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      this.validarRangoFechas(filtros.fecha_inicio, filtros.fecha_fin);
    }
  }

  protected async construirQueryBase(empresaId: string): Promise<any> {
    return {
      where: { empresa_id: parseInt(empresaId) },
      include: {
        usuario: {
          select: { nombre: true, email: true },
        },
        empresa: {
          select: { nombre: true },
        },
      },
      orderBy: { fecha_evento: 'desc' },
    };
  }

  protected async aplicarFiltros(
    query: any,
    filtros?: AuditoriaFilters,
  ): Promise<any> {
    if (!filtros) return query;

    const where = { ...query.where };

    if (filtros.accion) {
      where.accion = filtros.accion;
    }

    if (filtros.recurso) {
      where.recurso = filtros.recurso;
    }

    if (filtros.recurso_id) {
      where.recurso_id = filtros.recurso_id;
    }

    if (filtros.usuario_id) {
      where.usuario_id = filtros.usuario_id;
    }

    if (filtros.severidad) {
      where.severidad = filtros.severidad;
    }

    if (filtros.ip_address) {
      where.ip_address = filtros.ip_address;
    }

    if (filtros.acciones && filtros.acciones.length > 0) {
      where.accion = { in: filtros.acciones };
    }

    if (filtros.recursos && filtros.recursos.length > 0) {
      where.recurso = { in: filtros.recursos };
    }

    if (filtros.solo_criticos) {
      where.severidad = NivelSeveridad.CRITICAL;
    }

    if (filtros.excluir_lectura) {
      where.accion = { not: TipoAccion.LEER };
    }

    if (filtros.fecha_inicio || filtros.fecha_fin) {
      where.fecha_evento = {};
      if (filtros.fecha_inicio) {
        where.fecha_evento.gte = new Date(filtros.fecha_inicio);
      }
      if (filtros.fecha_fin) {
        where.fecha_evento.lte = new Date(filtros.fecha_fin);
      }
    }

    if (filtros.buscar) {
      where.OR = [
        { descripcion: { contains: filtros.buscar, mode: 'insensitive' } },
        { recurso_id: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }

    return { ...query, where };
  }

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

  protected async ejecutarConsulta(query: any): Promise<[any[], number]> {
    const [eventos, total] = await Promise.all([
      this.prisma.auditoria.findMany(query),
      this.prisma.auditoria.count({ where: query.where }),
    ]);

    return [eventos, total];
  }

  protected async formatearEventos(
    eventos: any[],
  ): Promise<AuditoriaFormatted[]> {
    return eventos.map((evento) => this.formatearEvento(evento));
  }

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

  protected async validarParametrosEstadisticas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<void> {
    if (!empresaId) {
      throw new BadRequestException('ID de empresa requerido');
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
    const where: any = { empresa_id: parseInt(empresaId) };

    if (fechaInicio || fechaFin) {
      where.fecha_evento = {};
      if (fechaInicio) where.fecha_evento.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha_evento.lte = new Date(fechaFin);
    }

    const total = await this.prisma.auditoria.count({ where });

    return { total_eventos: total };
  }

  protected async calcularEstadisticasPorDimension(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any> {
    const where: any = { empresa_id: parseInt(empresaId) };

    if (fechaInicio || fechaFin) {
      where.fecha_evento = {};
      if (fechaInicio) where.fecha_evento.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha_evento.lte = new Date(fechaFin);
    }

    const [porAccion, porRecurso, porSeveridad, porUsuario, ipsActivas] =
      await Promise.all([
        this.prisma.auditoria.groupBy({
          by: ['accion'],
          where,
          _count: { accion: true },
        }),
        this.prisma.auditoria.groupBy({
          by: ['recurso'],
          where,
          _count: { recurso: true },
        }),
        this.prisma.auditoria.groupBy({
          by: ['severidad'],
          where,
          _count: { severidad: true },
        }),
        this.prisma.auditoria.groupBy({
          by: ['usuario_id'],
          where: { ...where, usuario_id: { not: null } },
          _count: { usuario_id: true },
          orderBy: { _count: { usuario_id: 'desc' } },
          take: 10,
        }),
        this.prisma.auditoria.groupBy({
          by: ['ip_address'],
          where: { ...where, ip_address: { not: null } },
          _count: { ip_address: true },
          orderBy: { _count: { ip_address: 'desc' } },
          take: 10,
        }),
      ]);

    return {
      eventos_por_accion: this.convertirGrupoAObjeto(porAccion, 'accion'),
      eventos_por_recurso: this.convertirGrupoAObjeto(porRecurso, 'recurso'),
      eventos_por_severidad: this.convertirGrupoAObjeto(
        porSeveridad,
        'severidad',
      ),
      eventos_por_usuario: porUsuario.map((u) => ({
        usuario_id: u.usuario_id,
        usuario_nombre: 'Usuario', // Se puede enriquecer con join
        total_eventos: u._count.usuario_id,
      })),
      ips_mas_activas: ipsActivas.map((ip) => ({
        ip_address: ip.ip_address,
        total_eventos: ip._count.ip_address,
      })),
    };
  }

  protected async calcularTendencias(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<any> {
    const where: any = { empresa_id: parseInt(empresaId) };

    if (fechaInicio || fechaFin) {
      where.fecha_evento = {};
      if (fechaInicio) where.fecha_evento.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha_evento.lte = new Date(fechaFin);
    }

    // Eventos por día (últimos 30 días si no se especifica rango)
    const eventos = await this.prisma.auditoria.findMany({
      where,
      select: { fecha_evento: true },
      orderBy: { fecha_evento: 'asc' },
    });

    const eventosPorDia = this.agruparEventosPorDia(eventos);

    return {
      eventos_por_dia: eventosPorDia,
      recursos_mas_modificados: [], // Se puede implementar según necesidades
    };
  }

  protected combinarEstadisticas(
    basicas: any,
    porDimension: any,
    tendencias: any,
  ): AuditoriaStats {
    return {
      ...basicas,
      ...porDimension,
      ...tendencias,
    };
  }

  // Implementación de métodos abstractos adicionales

  async obtenerEventoPorId(
    id: string,
    empresaId: string,
  ): Promise<AuditoriaFormatted | null> {
    const evento = await this.prisma.auditoria.findFirst({
      where: { id, empresa_id: parseInt(empresaId) },
      include: {
        usuario: { select: { nombre: true, email: true } },
        empresa: { select: { nombre: true } },
      },
    });

    return evento ? this.formatearEvento(evento) : null;
  }

  async exportarEventos(
    empresaId: string,
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer> {
    const eventos = await this.prisma.auditoria.findMany({
      where: {
        empresa_id: parseInt(empresaId),
        ...(opciones.filtros &&
          (await this.construirFiltrosExportacion(opciones.filtros))),
      },
      include: {
        usuario: { select: { nombre: true, email: true } },
        empresa: { select: { nombre: true } },
      },
      orderBy: { fecha_evento: 'desc' },
    });

    const eventosFormateados = await this.formatearEventos(eventos);

    switch (opciones.formato) {
      case 'excel':
        return await this.exportarAExcel(eventosFormateados, opciones);
      case 'csv':
        return await this.exportarACSV(eventosFormateados, opciones);
      case 'pdf':
        return await this.exportarAPDF(eventosFormateados, opciones);
      default:
        throw new BadRequestException('Formato de exportación no soportado');
    }
  }

  async limpiarEventosAntiguos(diasRetencion: number): Promise<number> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

    const resultado = await this.prisma.auditoria.deleteMany({
      where: {
        fecha_evento: { lt: fechaLimite },
        severidad: { not: NivelSeveridad.CRITICAL }, // Mantener eventos críticos
      },
    });

    this.logger.log(`Eliminados ${resultado.count} eventos antiguos`);
    return resultado.count;
  }

  async validarAcceso(usuarioId: string, empresaId: string): Promise<boolean> {
    // Implementar lógica de validación de acceso según roles
    // Simplificar validación por ahora
    return true;
  }

  // Métodos auxiliares privados

  private async validarAntiSpam(context: AuditoriaContext): Promise<void> {
    const clave = `${context.empresa_id}-${context.usuario_id || context.ip_address}`;
    const ahora = Date.now();
    const ventana = 60000; // 1 minuto

    const eventos = this.eventosCache.get(clave) || 0;

    if (eventos >= this.EVENTOS_POR_MINUTO_LIMITE) {
      throw new BadRequestException('Límite de eventos por minuto excedido');
    }

    this.eventosCache.set(clave, eventos + 1);

    // Limpiar cache después de la ventana
    setTimeout(() => {
      this.eventosCache.delete(clave);
    }, ventana);
  }

  private esEventoCritico(data: any): boolean {
    const accionesCriticas = [
      TipoAccion.ELIMINAR,
      TipoAccion.ACCESO_DENEGADO,
      TipoAccion.LOGIN,
      TipoAccion.LOGOUT,
    ];

    const recursosCriticos = [
      TipoRecurso.USUARIO,
      TipoRecurso.EMPRESA,
      TipoRecurso.CONFIGURACION,
      TipoRecurso.SISTEMA,
    ];

    return (
      accionesCriticas.includes(data.accion) ||
      recursosCriticos.includes(data.recurso)
    );
  }

  private requiereNotificacion(evento: any): boolean {
    return (
      evento.severidad === NivelSeveridad.CRITICAL ||
      evento.severidad === NivelSeveridad.ERROR
    );
  }

  private async notificarEvento(evento: any): Promise<void> {
    // Implementar notificaciones según necesidades
    this.logger.warn(`Evento importante: ${evento.descripcion}`);
  }

  private convertirGrupoAObjeto(
    grupos: any[],
    campo: string,
  ): Record<string, number> {
    const resultado: Record<string, number> = {};
    grupos.forEach((grupo) => {
      resultado[grupo[campo]] = grupo._count[campo];
    });
    return resultado;
  }

  private agruparEventosPorDia(
    eventos: any[],
  ): Array<{ fecha: string; total_eventos: number }> {
    const grupos: Record<string, number> = {};

    eventos.forEach((evento) => {
      const fecha = evento.fecha_evento.toISOString().split('T')[0];
      grupos[fecha] = (grupos[fecha] || 0) + 1;
    });

    return Object.entries(grupos).map(([fecha, total]) => ({
      fecha,
      total_eventos: total,
    }));
  }

  private async construirFiltrosExportacion(
    filtros: AuditoriaFilters,
  ): Promise<any> {
    const where: any = {};

    if (filtros.fecha_inicio || filtros.fecha_fin) {
      where.fecha_evento = {};
      if (filtros.fecha_inicio)
        where.fecha_evento.gte = new Date(filtros.fecha_inicio);
      if (filtros.fecha_fin)
        where.fecha_evento.lte = new Date(filtros.fecha_fin);
    }

    return where;
  }

  private async exportarAExcel(
    eventos: AuditoriaFormatted[],
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auditoría');

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Fecha', key: 'created_at', width: 20 },
      { header: 'Acción', key: 'accion', width: 15 },
      { header: 'Recurso', key: 'recurso', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
      { header: 'Severidad', key: 'severidad', width: 12 },
      { header: 'Usuario', key: 'usuario_nombre', width: 25 },
      { header: 'IP', key: 'ip_address', width: 15 },
    ];

    // Agregar datos
    eventos.forEach((evento) => {
      worksheet.addRow({
        id: evento.id,
        fecha_evento: evento.fecha_evento,
        accion: evento.accion,
        recurso: evento.recurso,
        descripcion: evento.descripcion,
        severidad: evento.severidad,
        usuario_nombre: evento.usuario_nombre || 'Sistema',
        ip_address: evento.ip_address || 'N/A',
      });
    });

    // Formatear encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private async exportarACSV(
    eventos: AuditoriaFormatted[],
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer> {
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
    const rows = eventos.map((evento) => [
      evento.id,
      evento.fecha_evento.toISOString(),
      evento.accion,
      evento.recurso,
      evento.descripcion,
      evento.severidad,
      evento.usuario_nombre || 'Sistema',
      evento.ip_address || 'N/A',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  private async exportarAPDF(
    eventos: AuditoriaFormatted[],
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer> {
    // Implementación básica - se puede mejorar con librerías como puppeteer o pdfkit
    const html = `
      <html>
        <head>
          <title>Reporte de Auditoría</title>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Reporte de Auditoría</h1>
          <table>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Descripción</th>
              <th>Usuario</th>
            </tr>
            ${eventos
              .map(
                (evento) => `
              <tr>
                <td>${evento.fecha_evento.toISOString()}</td>
                <td>${evento.accion}</td>
                <td>${evento.recurso}</td>
                <td>${evento.descripcion}</td>
                <td>${evento.usuario_nombre || 'Sistema'}</td>
              </tr>
            `,
              )
              .join('')}
          </table>
        </body>
      </html>
    `;

    return Buffer.from(html, 'utf-8');
  }
}
