import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseWhatsappService } from './base-whatsapp.service';
import { WhatsappValidationService } from './whatsapp-validation.service';
import { WhatsappCalculationService } from './whatsapp-calculation.service';
import { CreateMensajeWhatsappDto } from '../dto/create-mensaje-whatsapp.dto';

/**
 * Servicio especializado para gestión de mensajes de WhatsApp
 * Principio: Single Responsibility - Solo maneja mensajes
 * Contexto: Específico para el mercado peruano
 */
@Injectable()
export class MensajesWhatsappService extends BaseWhatsappService {
  protected readonly logger = new Logger(MensajesWhatsappService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: WhatsappValidationService,
    protected readonly calculationService: WhatsappCalculationService,
  ) {
    super(prisma, validationService, calculationService);
  }

  /**
   * Crea un nuevo mensaje de WhatsApp
   * Implementa reglas específicas para el mercado peruano
   */
  async createMensaje(createMensajeDto: CreateMensajeWhatsappDto) {
    this.logger.log(
      `Creando mensaje WhatsApp para consulta ${createMensajeDto.id_consulta}`,
    );

    return await this.createMensajeTemplate(
      createMensajeDto,
      // Validaciones adicionales específicas para mensajes
      async () => {
        await this.validateMensajeBusinessRules(createMensajeDto);
      },
      // Procesamiento personalizado para mensajes
      (data) => {
        return this.applyMensajeBusinessLogic(data);
      },
    );
  }

  /**
   * Obtiene mensajes de una consulta específica
   * Incluye paginación y formateo para contexto peruano
   */
  async findMensajesByConsulta(consultaId: number, page = 1, limit = 50) {
    this.logger.log(
      `Obteniendo mensajes de consulta ${consultaId} - Página: ${page}`,
    );

    // Verificar que la consulta existe
    await this.verifyConsultaExists(consultaId);

    const skip = (page - 1) * limit;

    const [mensajes, total] = await Promise.all([
      this.prisma.mensajeWhatsapp.findMany({
        skip,
        take: limit,
        where: { id_consulta: consultaId },
        include: {
          consulta: {
            select: {
              id_consulta: true,
              numero_telefono: true,
              nombre_contacto: true,
              estado_consulta: true,
            },
          },
        },
        orderBy: { fecha_mensaje: 'asc' },
      }),
      this.prisma.mensajeWhatsapp.count({
        where: { id_consulta: consultaId },
      }),
    ]);

    const mensajesFormateados = mensajes.map((mensaje) =>
      this.formatPeruvianResponse(mensaje),
    );

    return {
      data: mensajesFormateados,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        consulta_info: mensajes[0]?.consulta || null,
      },
    };
  }

  /**
   * Obtiene el último mensaje de cada consulta para una empresa
   * Útil para dashboard de conversaciones activas
   */
  async findUltimosMensajesPorEmpresa(empresaId: number, limit = 20) {
    this.logger.log(`Obteniendo últimos mensajes para empresa ${empresaId}`);

    const consultas = await this.prisma.consultaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        estado_consulta: {
          not: 'CERRADA',
        },
      },
      include: {
        mensajes: {
          orderBy: { fecha_mensaje: 'desc' },
          take: 1,
        },
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        fecha_consulta: 'desc',
      },
      take: limit,
    });

    return consultas
      .filter((consulta) => consulta.mensajes.length > 0)
      .map((consulta) => ({
        consulta: this.formatPeruvianResponse(consulta),
        ultimo_mensaje: this.formatPeruvianResponse(consulta.mensajes[0]),
      }));
  }

  /**
   * Marca mensajes como leídos
   * Específico para el flujo de atención peruano
   */
  async marcarMensajesComoLeidos(consultaId: number, usuarioId: number) {
    this.logger.log(
      `Marcando mensajes como leídos - Consulta: ${consultaId}, Usuario: ${usuarioId}`,
    );

    await this.verifyConsultaExists(consultaId);

    const mensajesNoLeidos = await this.prisma.mensajeWhatsapp.updateMany({
      where: {
        id_consulta: consultaId,
        es_entrante: true, // Solo mensajes del cliente
      },
      data: {
        procesado: true,
      },
    });

    this.logger.log(
      `${mensajesNoLeidos.count} mensajes marcados como procesados`,
    );

    return {
      mensajes_marcados: mensajesNoLeidos.count,
      fecha_procesamiento: new Date(),
    };
  }

  /**
   * Obtiene estadísticas de mensajes para una empresa
   * Métricas específicas para el contexto peruano
   */
  async getEstadisticasMensajes(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ) {
    this.logger.log(
      `Obteniendo estadísticas de mensajes para empresa ${empresaId}`,
    );

    const fechaInicioFinal =
      fechaInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás
    const fechaFinFinal = fechaFin || new Date();

    const [
      totalMensajes,
      mensajesEnviados,
      mensajesRecibidos,
      mensajesPorTipo,
      mensajesPorHora,
      tiempoPromedioRespuesta,
    ] = await Promise.all([
      this.getTotalMensajes(empresaId, fechaInicioFinal, fechaFinFinal),
      this.getMensajesEnviados(empresaId, fechaInicioFinal, fechaFinFinal),
      this.getMensajesRecibidos(empresaId, fechaInicioFinal, fechaFinFinal),
      this.getMensajesPorTipo(empresaId, fechaInicioFinal, fechaFinFinal),
      this.getMensajesPorHora(empresaId, fechaInicioFinal, fechaFinFinal),
      this.getTiempoPromedioRespuesta(
        empresaId,
        fechaInicioFinal,
        fechaFinFinal,
      ),
    ]);

    return {
      periodo: {
        fecha_inicio: fechaInicioFinal.toISOString().split('T')[0],
        fecha_fin: fechaFinFinal.toISOString().split('T')[0],
      },
      totales: {
        total_mensajes: totalMensajes,
        mensajes_enviados: mensajesEnviados,
        mensajes_recibidos: mensajesRecibidos,
        tasa_respuesta:
          mensajesRecibidos > 0
            ? Math.round((mensajesEnviados / mensajesRecibidos) * 100)
            : 0,
      },
      distribucion: {
        por_tipo: mensajesPorTipo,
        por_hora: mensajesPorHora,
      },
      metricas: {
        tiempo_promedio_respuesta_minutos: tiempoPromedioRespuesta,
        mensajes_por_dia: Math.round(
          totalMensajes /
            this.getDiasEntreFechas(fechaInicioFinal, fechaFinFinal),
        ),
      },
    };
  }

  /**
   * Busca mensajes por contenido
   * Búsqueda específica para contexto peruano
   */
  async buscarMensajesPorContenido(
    empresaId: number,
    termino: string,
    page = 1,
    limit = 20,
    fechaInicio?: Date,
    fechaFin?: Date,
  ) {
    this.logger.log(
      `Buscando mensajes con término: "${termino}" para empresa ${empresaId}`,
    );

    const skip = (page - 1) * limit;
    const where: any = {
      consulta: {
        id_empresa: empresaId,
      },
      mensaje: {
        contains: termino,
        mode: 'insensitive',
      },
    };

    if (fechaInicio && fechaFin) {
      where.fecha_mensaje = {
        gte: fechaInicio,
        lte: fechaFin,
      };
    }

    const [mensajes, total] = await Promise.all([
      this.prisma.mensajeWhatsapp.findMany({
        skip,
        take: limit,
        where,
        include: {
          consulta: {
            select: {
              id_consulta: true,
              numero_telefono: true,
              nombre_contacto: true,
              tipo_consulta: true,
            },
          },
        },
        orderBy: { fecha_mensaje: 'desc' },
      }),
      this.prisma.mensajeWhatsapp.count({ where }),
    ]);

    const mensajesFormateados = mensajes.map((mensaje) => ({
      ...this.formatPeruvianResponse(mensaje),
      contenido_resaltado: this.resaltarTerminoEnContenido(
        mensaje.mensaje,
        termino,
      ),
    }));

    return {
      data: mensajesFormateados,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        termino_busqueda: termino,
      },
    };
  }

  /**
   * Implementa formateo específico para el contexto peruano
   */
  protected formatPeruvianResponse(data: any): any {
    if (!data) return data;

    return {
      ...data,
      // Formatear fecha y hora para zona horaria peruana
      fecha_mensaje_peru: this.formatPeruvianDateTime(data.fecha_mensaje),

      // Calcular tiempo transcurrido en español
      tiempo_transcurrido: this.calculateTimeElapsedInSpanish(
        data.fecha_mensaje,
      ),

      // Tipo de mensaje en español
      tipo_mensaje_texto: this.getTipoMensajeTexto(data.tipo_mensaje),

      // Estado de procesamiento en español
      estado_procesamiento: this.getEstadoProcesamiento(data),

      // Información del remitente formateada
      remitente_info: this.formatRemitenteInfo(data),
    };
  }

  /**
   * Aplica reglas de negocio específicas para el mercado peruano
   */
  protected async applyBusinessRules(data: any): Promise<any> {
    // Regla 1: Detección automática de spam
    const esPosibleSpam = this.detectarPosibleSpam(data.mensaje);
    if (esPosibleSpam) {
      data.marcado_spam = true;
      data.requiere_revision = true;
    }

    // Regla 2: Detección de palabras clave importantes
    const contieneInformacionImportante = this.detectarInformacionImportante(
      data.mensaje,
    );
    if (contieneInformacionImportante) {
      data.marcado_importante = true;
    }

    // Regla 3: Aplicar filtros de contenido para Perú
    data.contenido_filtrado = this.aplicarFiltrosContenidoPeru(data.mensaje);

    return data;
  }

  /**
   * Validaciones específicas de reglas de negocio para mensajes
   */
  private async validateMensajeBusinessRules(
    dto: CreateMensajeWhatsappDto,
  ): Promise<void> {
    // Validar límite de mensajes por minuto para prevenir spam
    const mensajesRecientes = await this.prisma.mensajeWhatsapp.count({
      where: {
        id_consulta: dto.id_consulta,
        fecha_mensaje: {
          gte: new Date(Date.now() - 60 * 1000), // Último minuto
        },
      },
    });

    if (mensajesRecientes >= 10) {
      throw new Error('Límite de mensajes por minuto excedido');
    }

    // Validar que la consulta no esté cerrada
    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: dto.id_consulta },
      select: { estado_consulta: true },
    });

    if (consulta?.estado_consulta === 'CERRADA') {
      throw new Error('No se pueden enviar mensajes a una consulta cerrada');
    }
  }

  /**
   * Aplica lógica de negocio específica para mensajes
   */
  private applyMensajeBusinessLogic(data: any): any {
    return {
      ...data,
      // Generar ID único de mensaje
      mensaje_id_externo: this.generateExternalMessageId(),

      // Detectar idioma del mensaje
      idioma_detectado: this.detectarIdioma(data.mensaje),

      // Calcular longitud y estadísticas
      estadisticas_contenido: this.calcularEstadisticasContenido(data.mensaje),
    };
  }

  /**
   * Obtiene total de mensajes en un período
   */
  private async getTotalMensajes(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    return await this.prisma.mensajeWhatsapp.count({
      where: {
        fecha_mensaje: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        consulta: {
          id_empresa: empresaId,
        },
      },
    });
  }

  /**
   * Obtiene mensajes enviados por la empresa
   */
  private async getMensajesEnviados(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    return await this.prisma.mensajeWhatsapp.count({
      where: {
        fecha_mensaje: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        es_entrante: false,
        consulta: {
          id_empresa: empresaId,
        },
      },
    });
  }

  /**
   * Obtiene mensajes recibidos de clientes
   */
  private async getMensajesRecibidos(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    return await this.prisma.mensajeWhatsapp.count({
      where: {
        fecha_mensaje: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        es_entrante: true,
        consulta: {
          id_empresa: empresaId,
        },
      },
    });
  }

  /**
   * Obtiene distribución de mensajes por tipo
   */
  private async getMensajesPorTipo(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const mensajesPorTipo = await this.prisma.mensajeWhatsapp.groupBy({
      by: ['tipo_mensaje'],
      where: {
        fecha_mensaje: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        consulta: {
          id_empresa: empresaId,
        },
      },
      _count: {
        id_mensaje: true,
      },
    });

    return mensajesPorTipo.reduce(
      (acc, item) => {
        acc[item.tipo_mensaje] = item._count.id_mensaje;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Obtiene distribución de mensajes por hora del día
   */
  private async getMensajesPorHora(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const mensajes = await this.prisma.mensajeWhatsapp.findMany({
      where: {
        fecha_mensaje: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        consulta: {
          id_empresa: empresaId,
        },
      },
      select: {
        fecha_mensaje: true,
      },
    });

    const distribucionPorHora = Array(24).fill(0);

    mensajes.forEach((mensaje) => {
      const hora = mensaje.fecha_mensaje.getHours();
      distribucionPorHora[hora]++;
    });

    return distribucionPorHora.map((cantidad, hora) => ({
      hora,
      cantidad,
    }));
  }

  /**
   * Calcula tiempo promedio de respuesta
   */
  private async getTiempoPromedioRespuesta(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    // Implementar cálculo de tiempo promedio de respuesta
    return await this.calculationService.calculateTiempoPromedioRespuesta(
      empresaId,
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * Calcula días entre fechas
   */
  private getDiasEntreFechas(fechaInicio: Date, fechaFin: Date): number {
    const diferencia = fechaFin.getTime() - fechaInicio.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  /**
   * Resalta término de búsqueda en el contenido
   */
  private resaltarTerminoEnContenido(
    contenido: string,
    termino: string,
  ): string {
    const regex = new RegExp(`(${termino})`, 'gi');
    return contenido.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Formatea fecha y hora para zona horaria peruana
   */
  private formatPeruvianDateTime(date: Date): string {
    if (!date) return '';

    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  /**
   * Calcula tiempo transcurrido en español
   */
  private calculateTimeElapsedInSpanish(fechaInicio: Date): string {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fechaInicio.getTime();

    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) return `${dias} día${dias > 1 ? 's' : ''}`;
    if (horas > 0) return `${horas} hora${horas > 1 ? 's' : ''}`;
    if (minutos > 0) return `${minutos} minuto${minutos > 1 ? 's' : ''}`;

    return 'Hace un momento';
  }

  /**
   * Obtiene texto descriptivo del tipo de mensaje
   */
  private getTipoMensajeTexto(tipo: string): string {
    const tipos = {
      texto: 'Texto',
      imagen: 'Imagen',
      documento: 'Documento',
      audio: 'Audio',
      video: 'Video',
      ubicacion: 'Ubicación',
      contacto: 'Contacto',
      sticker: 'Sticker',
    };

    return tipos[tipo] || tipo;
  }

  /**
   * Obtiene estado de procesamiento en español
   */
  private getEstadoProcesamiento(mensaje: any): string {
    if (!mensaje.es_entrante) {
      return 'Enviado';
    }

    if (mensaje.procesado) {
      return 'Procesado';
    }

    return 'Pendiente';
  }

  /**
   * Formatea información del remitente
   */
  private formatRemitenteInfo(mensaje: any): any {
    if (!mensaje.es_entrante) {
      return {
        tipo: 'Agente',
        nombre: 'Sistema',
        id: null,
      };
    }

    return {
      tipo: 'Cliente',
      nombre: mensaje.consulta?.nombre_contacto || 'Cliente',
      telefono: mensaje.consulta?.numero_telefono,
    };
  }

  /**
   * Detecta posible spam en el contenido
   */
  private detectarPosibleSpam(contenido: string): boolean {
    const palabrasSpam = [
      'promocion',
      'oferta',
      'gratis',
      'descuento',
      'ganador',
    ];
    const contenidoLower = contenido.toLowerCase();

    return palabrasSpam.some((palabra) => contenidoLower.includes(palabra));
  }

  /**
   * Detecta información importante en el contenido
   */
  private detectarInformacionImportante(contenido: string): boolean {
    const palabrasImportantes = [
      'urgente',
      'problema',
      'error',
      'falla',
      'reclamo',
    ];
    const contenidoLower = contenido.toLowerCase();

    return palabrasImportantes.some((palabra) =>
      contenidoLower.includes(palabra),
    );
  }

  /**
   * Aplica filtros de contenido específicos para Perú
   */
  private aplicarFiltrosContenidoPeru(contenido: string): string {
    // Aplicar filtros específicos para el contexto peruano
    return contenido
      .replace(/\b(wsp|whatsapp)\b/gi, 'WhatsApp')
      .replace(/\b(pe|peru)\b/gi, 'Perú');
  }

  /**
   * Genera ID único de mensaje externo
   */
  private generateExternalMessageId(): string {
    return `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detecta idioma del mensaje
   */
  private detectarIdioma(contenido: string): string {
    // Implementación básica de detección de idioma
    const palabrasEspanol = [
      'el',
      'la',
      'de',
      'que',
      'y',
      'en',
      'un',
      'es',
      'se',
      'no',
    ];
    const palabrasEncontradas = palabrasEspanol.filter((palabra) =>
      contenido.toLowerCase().includes(palabra),
    );

    return palabrasEncontradas.length > 2 ? 'es' : 'unknown';
  }

  /**
   * Calcula estadísticas del contenido
   */
  private calcularEstadisticasContenido(contenido: string) {
    return {
      longitud_caracteres: contenido.length,
      longitud_palabras: contenido.split(/\s+/).length,
      contiene_emojis:
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
          contenido,
        ),
      contiene_urls: /https?:\/\/[^\s]+/gi.test(contenido),
      contiene_telefono: /(\+51|51)?[9][0-9]{8}/.test(contenido),
    };
  }
}
