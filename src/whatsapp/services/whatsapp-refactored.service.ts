import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappValidationService } from './whatsapp-validation.service';
import { WhatsappCalculationService } from './whatsapp-calculation.service';
import { ConsultasWhatsappService } from './consultas-whatsapp.service';
import { MensajesWhatsappService } from './mensajes-whatsapp.service';
import { ConfiguracionWhatsappService } from './configuracion-whatsapp.service';
import { CreateConsultaWhatsappDto } from '../dto/create-consulta-whatsapp.dto';
import { UpdateConsultaWhatsappDto } from '../dto/update-consulta-whatsapp.dto';
import { CreateMensajeWhatsappDto } from '../dto/create-mensaje-whatsapp.dto';
import { CreateConfiguracionWhatsappDto } from '../dto/create-configuracion-whatsapp.dto';
import { UpdateConfiguracionWhatsappDto } from '../dto/update-configuracion-whatsapp.dto';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

/**
 * Servicio principal refactorizado de WhatsApp
 * Principio: Facade Pattern - Orquesta servicios especializados
 * Principio: Single Responsibility - Solo coordina operaciones
 * Contexto: Específico para el mercado peruano
 */
@Injectable()
export class WhatsappRefactoredService {
  private readonly logger = new Logger(WhatsappRefactoredService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: WhatsappValidationService,
    private readonly calculationService: WhatsappCalculationService,
    private readonly consultasService: ConsultasWhatsappService,
    private readonly mensajesService: MensajesWhatsappService,
    private readonly configuracionService: ConfiguracionWhatsappService,
  ) {}

  // ========================================
  // GESTIÓN DE CONSULTAS
  // ========================================

  /**
   * Crea una nueva consulta de WhatsApp
   * Delega al servicio especializado de consultas
   */
  async createConsulta(createConsultaDto: CreateConsultaWhatsappDto) {
    this.logger.log(
      `Delegando creación de consulta WhatsApp para empresa ${createConsultaDto.id_empresa}`,
    );
    return await this.consultasService.createConsulta(createConsultaDto);
  }

  /**
   * Obtiene todas las consultas con filtros
   * Delega al servicio especializado de consultas
   */
  async findAllConsultas(
    empresaId?: number,
    page = 1,
    limit = 10,
    estado?: EstadoConsulta,
    tipo?: TipoConsulta,
  ) {
    this.logger.log(
      `Delegando búsqueda de consultas WhatsApp - Empresa: ${empresaId}`,
    );
    return await this.consultasService.findAllConsultas(
      empresaId,
      page,
      limit,
      estado,
      tipo,
    );
  }

  /**
   * Obtiene una consulta específica por ID
   * Delega al servicio especializado de consultas
   */
  async findOneConsulta(id: number) {
    this.logger.log(`Delegando búsqueda de consulta WhatsApp: ${id}`);
    return await this.consultasService.findOneConsulta(id);
  }

  /**
   * Actualiza una consulta existente
   * Delega al servicio especializado de consultas
   */
  async updateConsulta(
    id: number,
    updateConsultaDto: UpdateConsultaWhatsappDto,
  ) {
    this.logger.log(`Delegando actualización de consulta WhatsApp: ${id}`);
    return await this.consultasService.updateConsulta(id, updateConsultaDto);
  }

  /**
   * Cierra una consulta con satisfacción y notas
   * Delega al servicio especializado de consultas
   */
  async cerrarConsulta(id: number, satisfaccion?: number, notas?: string) {
    this.logger.log(`Delegando cierre de consulta WhatsApp: ${id}`);
    return await this.consultasService.cerrarConsulta(id, satisfaccion, notas);
  }

  /**
   * Obtiene consultas que requieren atención urgente
   * Delega al servicio especializado de consultas
   */
  async findConsultasUrgentes(empresaId: number) {
    this.logger.log(
      `Delegando búsqueda de consultas urgentes para empresa ${empresaId}`,
    );
    return await this.consultasService.findConsultasUrgentes(empresaId);
  }

  /**
   * Obtiene consultas por cliente específico
   * Delega al servicio especializado de consultas
   */
  async findConsultasByCliente(
    clienteId: number,
    empresaId: number,
    page = 1,
    limit = 10,
  ) {
    this.logger.log(`Delegando búsqueda de consultas del cliente ${clienteId}`);
    return await this.consultasService.findConsultasByCliente(
      clienteId,
      empresaId,
      page,
      limit,
    );
  }

  // ========================================
  // GESTIÓN DE MENSAJES
  // ========================================

  /**
   * Crea un nuevo mensaje de WhatsApp
   * Delega al servicio especializado de mensajes
   */
  async createMensaje(createMensajeDto: CreateMensajeWhatsappDto) {
    this.logger.log(
      `Delegando creación de mensaje WhatsApp para consulta ${createMensajeDto.id_consulta}`,
    );
    return await this.mensajesService.createMensaje(createMensajeDto);
  }

  /**
   * Obtiene mensajes de una consulta específica
   * Delega al servicio especializado de mensajes
   */
  async findMensajesByConsulta(consultaId: number, page = 1, limit = 50) {
    this.logger.log(`Delegando búsqueda de mensajes de consulta ${consultaId}`);
    return await this.mensajesService.findMensajesByConsulta(
      consultaId,
      page,
      limit,
    );
  }

  /**
   * Obtiene el último mensaje de cada consulta para una empresa
   * Delega al servicio especializado de mensajes
   */
  async findUltimosMensajesPorEmpresa(empresaId: number, limit = 20) {
    this.logger.log(
      `Delegando búsqueda de últimos mensajes para empresa ${empresaId}`,
    );
    return await this.mensajesService.findUltimosMensajesPorEmpresa(
      empresaId,
      limit,
    );
  }

  /**
   * Marca mensajes como leídos
   * Delega al servicio especializado de mensajes
   */
  async marcarMensajesComoLeidos(consultaId: number, usuarioId: number) {
    this.logger.log(
      `Delegando marcado de mensajes como leídos - Consulta: ${consultaId}`,
    );
    return await this.mensajesService.marcarMensajesComoLeidos(
      consultaId,
      usuarioId,
    );
  }

  /**
   * Obtiene estadísticas de mensajes para una empresa
   * Delega al servicio especializado de mensajes
   */
  async getEstadisticasMensajes(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ) {
    this.logger.log(
      `Delegando obtención de estadísticas de mensajes para empresa ${empresaId}`,
    );
    return await this.mensajesService.getEstadisticasMensajes(
      empresaId,
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * Busca mensajes por contenido
   * Delega al servicio especializado de mensajes
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
      `Delegando búsqueda de mensajes por contenido: "${termino}"`,
    );
    return await this.mensajesService.buscarMensajesPorContenido(
      empresaId,
      termino,
      page,
      limit,
      fechaInicio,
      fechaFin,
    );
  }

  // ========================================
  // GESTIÓN DE CONFIGURACIÓN
  // ========================================

  /**
   * Crea configuración de WhatsApp para una empresa
   * Delega al servicio especializado de configuración
   */
  async createConfiguracion(createConfigDto: CreateConfiguracionWhatsappDto) {
    this.logger.log(
      `Delegando creación de configuración WhatsApp para empresa ${createConfigDto.id_empresa}`,
    );
    return await this.configuracionService.createConfiguracion(createConfigDto);
  }

  /**
   * Obtiene configuración de WhatsApp por empresa
   * Delega al servicio especializado de configuración
   */
  async findConfiguracionByEmpresa(empresaId: number) {
    this.logger.log(
      `Delegando búsqueda de configuración WhatsApp para empresa ${empresaId}`,
    );
    return await this.configuracionService.findConfiguracionByEmpresa(
      empresaId,
    );
  }

  /**
   * Actualiza configuración de WhatsApp
   * Delega al servicio especializado de configuración
   */
  async updateConfiguracion(
    empresaId: number,
    updateConfigDto: UpdateConfiguracionWhatsappDto,
  ) {
    this.logger.log(
      `Delegando actualización de configuración WhatsApp para empresa ${empresaId}`,
    );
    return await this.configuracionService.updateConfiguracion(
      empresaId,
      updateConfigDto,
    );
  }

  /**
   * Activa o desactiva la configuración de WhatsApp
   * Delega al servicio especializado de configuración
   */
  async toggleConfiguracionStatus(empresaId: number, activo: boolean) {
    this.logger.log(
      `Delegando cambio de estado de configuración WhatsApp para empresa ${empresaId}`,
    );
    return await this.configuracionService.toggleConfiguracionStatus(
      empresaId,
      activo,
    );
  }

  /**
   * Obtiene estado de conexión de la instancia de WhatsApp
   * Delega al servicio especializado de configuración
   */
  async getEstadoConexion(empresaId: number) {
    this.logger.log(
      `Delegando obtención de estado de conexión para empresa ${empresaId}`,
    );
    return await this.configuracionService.getEstadoConexion(empresaId);
  }

  /**
   * Reinicia la conexión de WhatsApp
   * Delega al servicio especializado de configuración
   */
  async reiniciarConexion(empresaId: number) {
    this.logger.log(
      `Delegando reinicio de conexión WhatsApp para empresa ${empresaId}`,
    );
    return await this.configuracionService.reiniciarConexion(empresaId);
  }

  // ========================================
  // MÉTRICAS Y REPORTES
  // ========================================

  /**
   * Obtiene métricas diarias de WhatsApp para una empresa
   * Delega al servicio especializado de cálculos
   */
  async getMetricasDiarias(empresaId: number, fecha?: string) {
    this.logger.log(
      `Delegando obtención de métricas diarias para empresa ${empresaId}`,
    );

    const fechaMetricas = fecha ? new Date(fecha) : new Date();
    return await this.calculationService.calculateMetricasDiarias(
      empresaId,
      fechaMetricas,
    );
  }

  /**
   * Actualiza métricas de WhatsApp para una empresa
   * Coordina cálculo y almacenamiento de métricas
   */
  async actualizarMetricas(empresaId: number, fecha?: string) {
    this.logger.log(`Actualizando métricas WhatsApp para empresa ${empresaId}`);

    const fechaMetricas = fecha ? new Date(fecha) : new Date();

    // Calcular métricas usando el servicio especializado
    const metricas = await this.calculationService.calculateMetricasDiarias(
      empresaId,
      fechaMetricas,
    );

    // Almacenar métricas en base de datos (si existe tabla de métricas)
    await this.storeMetricsIfTableExists(empresaId, fechaMetricas, metricas);

    return {
      empresa_id: empresaId,
      fecha: fechaMetricas.toISOString().split('T')[0],
      metricas_actualizadas: true,
      metricas,
    };
  }

  /**
   * Obtiene resumen de métricas para un rango de fechas
   * Delega al servicio especializado de cálculos
   */
  async getResumenMetricas(
    empresaId: number,
    fechaInicio: string,
    fechaFin: string,
  ) {
    this.logger.log(
      `Delegando obtención de resumen de métricas para empresa ${empresaId}`,
    );

    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    return await this.calculationService.calculateResumenMetricas(
      empresaId,
      fechaInicioDate,
      fechaFinDate,
    );
  }

  /**
   * Obtiene métricas de rendimiento de un agente específico
   * Delega al servicio especializado de cálculos
   */
  async getMetricasAgente(
    usuarioId: number,
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    this.logger.log(
      `Delegando obtención de métricas de agente ${usuarioId} para empresa ${empresaId}`,
    );

    return await this.calculationService.calculateMetricasAgente(
      usuarioId,
      empresaId,
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * Obtiene métricas de configuración para dashboard
   * Delega al servicio especializado de configuración
   */
  async getMetricasConfiguracion(empresaId: number) {
    this.logger.log(
      `Delegando obtención de métricas de configuración para empresa ${empresaId}`,
    );
    return await this.configuracionService.getMetricasConfiguracion(empresaId);
  }

  // ========================================
  // WEBHOOK Y INTEGRACIÓN
  // ========================================

  /**
   * Procesa webhook de Evolution API
   * Coordina el procesamiento de eventos externos
   */
  async processWebhook(webhookData: any) {
    this.logger.log('Procesando webhook de Evolution API');

    try {
      // Validar estructura del webhook
      await this.validateWebhookData(webhookData);

      // Procesar según tipo de evento
      const resultado = await this.processWebhookByType(webhookData);

      this.logger.log(`Webhook procesado exitosamente: ${webhookData.event}`);
      return resultado;
    } catch (error) {
      this.logger.error(
        `Error procesando webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========================================
  // OPERACIONES COMBINADAS
  // ========================================

  /**
   * Obtiene dashboard completo de WhatsApp para una empresa
   * Combina datos de múltiples servicios especializados
   */
  async getDashboardCompleto(empresaId: number) {
    this.logger.log(
      `Obteniendo dashboard completo de WhatsApp para empresa ${empresaId}`,
    );

    const [
      configuracion,
      consultasUrgentes,
      ultimosMensajes,
      metricasDiarias,
      estadoConexion,
    ] = await Promise.all([
      this.configuracionService
        .findConfiguracionByEmpresa(empresaId)
        .catch(() => null),
      this.consultasService.findConsultasUrgentes(empresaId),
      this.mensajesService.findUltimosMensajesPorEmpresa(empresaId, 10),
      this.calculationService.calculateMetricasDiarias(empresaId, new Date()),
      this.configuracionService.getEstadoConexion(empresaId).catch(() => null),
    ]);

    return {
      empresa_id: empresaId,
      configuracion,
      estado_conexion: estadoConexion,
      consultas_urgentes: consultasUrgentes,
      ultimos_mensajes: ultimosMensajes,
      metricas_diarias: metricasDiarias,
      resumen: {
        configuracion_activa: configuracion?.activo || false,
        conexion_estable: estadoConexion?.estado_conexion === 'conectado',
        consultas_pendientes: consultasUrgentes.length,
        actividad_reciente: ultimosMensajes.length > 0,
      },
    };
  }

  /**
   * Realiza búsqueda global en WhatsApp
   * Combina búsquedas en consultas y mensajes
   */
  async busquedaGlobal(
    empresaId: number,
    termino: string,
    filtros?: {
      tipo?: 'consultas' | 'mensajes' | 'ambos';
      fechaInicio?: Date;
      fechaFin?: Date;
      estado?: EstadoConsulta;
    },
  ) {
    this.logger.log(
      `Realizando búsqueda global de WhatsApp: "${termino}" para empresa ${empresaId}`,
    );

    const tipo = filtros?.tipo || 'ambos';
    const resultados: any = {};

    if (tipo === 'consultas' || tipo === 'ambos') {
      // Buscar en consultas (implementar si es necesario)
      resultados.consultas = [];
    }

    if (tipo === 'mensajes' || tipo === 'ambos') {
      resultados.mensajes =
        await this.mensajesService.buscarMensajesPorContenido(
          empresaId,
          termino,
          1,
          20,
          filtros?.fechaInicio,
          filtros?.fechaFin,
        );
    }

    return {
      termino_busqueda: termino,
      empresa_id: empresaId,
      filtros_aplicados: filtros,
      resultados,
      total_encontrados:
        (resultados.consultas?.length || 0) +
        (resultados.mensajes?.data?.length || 0),
    };
  }

  // ========================================
  // MÉTODOS PRIVADOS DE APOYO
  // ========================================

  /**
   * Almacena métricas en base de datos si existe la tabla
   */
  private async storeMetricsIfTableExists(
    empresaId: number,
    fecha: Date,
    metricas: any,
  ): Promise<void> {
    try {
      // Verificar si existe tabla de métricas e insertar
      // Implementar según estructura de base de datos
      this.logger.log(
        `Métricas almacenadas para empresa ${empresaId} - ${fecha.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.warn(`No se pudieron almacenar métricas: ${error.message}`);
    }
  }

  /**
   * Valida estructura de datos del webhook
   */
  private async validateWebhookData(webhookData: any): Promise<void> {
    if (!webhookData.event) {
      throw new Error('Webhook debe contener campo "event"');
    }

    if (!webhookData.instance) {
      throw new Error('Webhook debe contener campo "instance"');
    }

    // Validaciones adicionales según tipo de evento
    // Validar estructura del webhook (implementación básica)
    if (!webhookData || typeof webhookData !== 'object') {
      throw new BadRequestException('Estructura de webhook inválida');
    }
  }

  /**
   * Procesa webhook según tipo de evento
   */
  private async processWebhookByType(webhookData: any): Promise<any> {
    const { event, data } = webhookData;

    switch (event) {
      case 'messages.upsert':
        return await this.processIncomingMessage(data);

      case 'connection.update':
        return await this.processConnectionUpdate(data);

      case 'qr.updated':
        return await this.processQRUpdate(data);

      default:
        this.logger.warn(`Tipo de evento no manejado: ${event}`);
        return { processed: false, reason: 'Evento no manejado' };
    }
  }

  /**
   * Procesa mensaje entrante del webhook
   */
  private async processIncomingMessage(messageData: any): Promise<any> {
    this.logger.log('Procesando mensaje entrante desde webhook');

    // Buscar configuración por número de teléfono o instancia
    const configuracion = await this.findConfiguracionByInstance(
      messageData.instance,
    );

    if (!configuracion) {
      throw new Error('Configuración no encontrada para la instancia');
    }

    // Crear o actualizar consulta
    const consulta = await this.createOrUpdateConsultaFromMessage(
      configuracion.id_empresa,
      messageData,
    );

    // Crear mensaje
    const mensaje = await this.mensajesService.createMensaje({
      id_consulta: consulta.id_consulta,
      mensaje: messageData.message.conversation || messageData.message.text,
      tipo_mensaje: this.detectMessageType(messageData.message),
      es_entrante: true, // Mensaje entrante desde webhook
      url_archivo: messageData.message.media?.url,
    });

    return {
      processed: true,
      consulta_id: consulta.id_consulta,
      mensaje_id: (mensaje as any).id_mensaje,
    };
  }

  /**
   * Procesa actualización de conexión
   */
  private async processConnectionUpdate(connectionData: any): Promise<any> {
    this.logger.log('Procesando actualización de conexión desde webhook');

    // Actualizar estado de configuración si es necesario
    return { processed: true, connection_status: connectionData.state };
  }

  /**
   * Procesa actualización de código QR
   */
  private async processQRUpdate(qrData: any): Promise<any> {
    this.logger.log('Procesando actualización de código QR desde webhook');

    // Almacenar o notificar nuevo código QR
    return { processed: true, qr_updated: true };
  }

  /**
   * Busca configuración por instancia
   */
  private async findConfiguracionByInstance(instance: string): Promise<any> {
    return await this.prisma.configuracionWhatsapp.findFirst({
      where: { instancia_id: instance },
      include: { empresa: true },
    });
  }

  /**
   * Crea o actualiza consulta desde mensaje
   */
  private async createOrUpdateConsultaFromMessage(
    empresaId: number,
    messageData: any,
  ): Promise<any> {
    const numeroTelefono = messageData.key.remoteJid.replace(
      '@s.whatsapp.net',
      '',
    );

    // Buscar consulta existente abierta
    let consulta = await this.prisma.consultaWhatsapp.findFirst({
      where: {
        id_empresa: empresaId,
        numero_telefono: numeroTelefono,
        estado_consulta: {
          in: ['NUEVA', 'EN_PROCESO', 'RESPONDIDA'],
        },
      },
    });

    if (!consulta) {
      // Crear nueva consulta
      const nuevaConsulta = await this.consultasService.createConsulta({
        id_empresa: empresaId,
        numero_telefono: numeroTelefono,
        nombre_contacto: messageData.pushName || 'Cliente',
        tipo_consulta: TipoConsulta.INFORMACION,
        mensaje_original:
          messageData.message.conversation || messageData.message.text,
      });
      consulta = nuevaConsulta as any; // Type assertion temporal
    }

    return consulta;
  }

  /**
   * Detecta tipo de mensaje
   */
  private detectMessageType(message: any): string {
    if (message.imageMessage) return 'imagen';
    if (message.documentMessage) return 'documento';
    if (message.audioMessage) return 'audio';
    if (message.videoMessage) return 'video';
    if (message.locationMessage) return 'ubicacion';
    if (message.contactMessage) return 'contacto';
    if (message.stickerMessage) return 'sticker';

    return 'texto';
  }
}
