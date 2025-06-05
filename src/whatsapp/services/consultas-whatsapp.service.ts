import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseWhatsappService } from './base-whatsapp.service';
import { WhatsappValidationService } from './whatsapp-validation.service';
import { WhatsappCalculationService } from './whatsapp-calculation.service';
import { CreateConsultaWhatsappDto } from '../dto/create-consulta-whatsapp.dto';
import { UpdateConsultaWhatsappDto } from '../dto/update-consulta-whatsapp.dto';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

/**
 * Servicio especializado para gestión de consultas de WhatsApp
 * Principio: Single Responsibility - Solo maneja consultas
 * Contexto: Específico para el mercado peruano
 */
@Injectable()
export class ConsultasWhatsappService extends BaseWhatsappService {
  protected readonly logger = new Logger(ConsultasWhatsappService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: WhatsappValidationService,
    protected readonly calculationService: WhatsappCalculationService,
  ) {
    super(prisma, validationService, calculationService);
  }

  /**
   * Crea una nueva consulta de WhatsApp
   * Implementa reglas específicas para el mercado peruano
   */
  async createConsulta(createConsultaDto: CreateConsultaWhatsappDto) {
    this.logger.log(
      `Creando consulta WhatsApp para empresa ${createConsultaDto.id_empresa}`,
    );

    return await this.createConsultaTemplate(
      createConsultaDto,
      // Validaciones adicionales específicas para consultas
      async () => {
        await this.validateConsultaBusinessRules(createConsultaDto);
      },
      // Procesamiento personalizado para consultas
      (data) => {
        return this.applyConsultaBusinessLogic(data);
      },
    );
  }

  /**
   * Obtiene todas las consultas con filtros
   * Incluye paginación y filtros específicos para Perú
   */
  async findAllConsultas(
    empresaId?: number,
    page = 1,
    limit = 10,
    estado?: EstadoConsulta,
    tipo?: TipoConsulta,
  ) {
    this.logger.log(
      `Obteniendo consultas WhatsApp - Empresa: ${empresaId}, Página: ${page}`,
    );

    const filters = {
      empresaId,
      estado,
      tipo,
    };

    const result = await this.findConsultasTemplate(
      filters,
      { page, limit },
      // Includes personalizados para consultas
      {
        mensajes: {
          orderBy: { fecha_mensaje: 'desc' },
          take: 3, // Últimos 3 mensajes para preview
          select: {
            id_mensaje: true,
            mensaje: true,
            tipo_mensaje: true,
            es_entrante: true,
            fecha_mensaje: true,
          },
        },
      },
    );

    // Formatear respuesta para contexto peruano
    result.data = result.data.map((consulta) =>
      this.formatPeruvianResponse(consulta),
    );

    return result;
  }

  /**
   * Obtiene una consulta específica por ID
   * Incluye toda la información detallada
   */
  async findOneConsulta(id: number) {
    this.logger.log(`Obteniendo consulta WhatsApp: ${id}`);

    await this.verifyConsultaExists(id);

    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: id },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            telefono: true,
            ruc: true,
          },
        },
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
        mensajes: {
          orderBy: { fecha_mensaje: 'asc' },
        },
        cotizacion: {
          select: {
            id_cotizacion: true,
            total: true,
            estado: true,
            fecha_emision: true,
          },
        },
      },
    });

    return this.formatPeruvianResponse(consulta);
  }

  /**
   * Actualiza una consulta existente
   * Aplica reglas de negocio específicas
   */
  async updateConsulta(
    id: number,
    updateConsultaDto: UpdateConsultaWhatsappDto,
  ) {
    this.logger.log(`Actualizando consulta WhatsApp: ${id}`);

    return await this.updateConsultaTemplate(
      id,
      updateConsultaDto,
      // Validaciones adicionales para actualización
      async () => {
        await this.validateConsultaUpdateRules(id, updateConsultaDto);
      },
      // Procesamiento personalizado para actualización
      (data) => {
        return this.applyConsultaUpdateLogic(data, updateConsultaDto);
      },
    );
  }

  /**
   * Cierra una consulta con satisfacción y notas
   * Específico para el flujo de atención peruano
   */
  async cerrarConsulta(id: number, satisfaccion?: number, notas?: string) {
    this.logger.log(`Cerrando consulta WhatsApp: ${id}`);

    await this.verifyConsultaExists(id);

    // Validar satisfacción si se proporciona
    if (satisfaccion !== undefined) {
      this.validateSatisfaccionScore(satisfaccion);
    }

    const updateData = {
      estado_consulta: EstadoConsulta.CERRADA,
      satisfaccion,
      notas_internas: notas,
      fecha_cierre: new Date(),
    };

    const consulta = await this.executeConsultaUpdate(id, updateData);

    // Post-procesamiento específico para cierre
    await this.postProcessConsultaCierre(consulta);

    return this.formatPeruvianResponse(consulta);
  }

  /**
   * Obtiene consultas por cliente específico
   * Útil para historial de atención
   */
  async findConsultasByCliente(
    clienteId: number,
    empresaId: number,
    page = 1,
    limit = 10,
  ) {
    this.logger.log(
      `Obteniendo consultas del cliente ${clienteId} para empresa ${empresaId}`,
    );

    const filters = {
      empresaId,
      clienteId,
    };

    const result = await this.findConsultasTemplate(
      filters,
      { page, limit },
      {
        mensajes: {
          orderBy: { fecha_mensaje: 'desc' },
          take: 1,
        },
      },
    );

    result.data = result.data.map((consulta) =>
      this.formatPeruvianResponse(consulta),
    );

    return result;
  }

  /**
   * Obtiene consultas que requieren atención urgente
   * Basado en tiempo de respuesta y tipo de consulta
   */
  async findConsultasUrgentes(empresaId: number) {
    this.logger.log(`Obteniendo consultas urgentes para empresa ${empresaId}`);

    const horasUmbral = 2; // 2 horas sin respuesta
    const fechaUmbral = new Date();
    fechaUmbral.setHours(fechaUmbral.getHours() - horasUmbral);

    const consultas = await this.prisma.consultaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        estado_consulta: {
          in: [EstadoConsulta.NUEVA, EstadoConsulta.EN_PROCESO],
        },
        OR: [
          {
            // Consultas sin respuesta después del umbral
            fecha_consulta: {
              lte: fechaUmbral,
            },
            fecha_respuesta: null,
          },
          {
            // Consultas marcadas como requieren atención
            requiere_atencion: true,
          },
          {
            // Tipos de consulta prioritarios
            tipo_consulta: {
              in: [TipoConsulta.RECLAMO],
            },
          },
        ],
      },
      include: this.prepareConsultasBaseIncludes(),
      orderBy: [{ requiere_atencion: 'desc' }, { fecha_consulta: 'asc' }],
    });

    return consultas.map((consulta) => this.formatPeruvianResponse(consulta));
  }

  /**
   * Implementa formateo específico para el contexto peruano
   */
  protected formatPeruvianResponse(data: any): any {
    if (!data) return data;

    return {
      ...data,
      // Formatear teléfono peruano
      numero_telefono_formateado: this.formatPeruvianPhone(
        data.numero_telefono,
      ),

      // Agregar información de zona horaria peruana
      fecha_consulta_peru: this.formatPeruvianDateTime(data.fecha_consulta),
      fecha_respuesta_peru: data.fecha_respuesta
        ? this.formatPeruvianDateTime(data.fecha_respuesta)
        : null,

      // Calcular tiempo transcurrido en español
      tiempo_transcurrido: this.calculateTimeElapsedInSpanish(
        data.fecha_consulta,
      ),

      // Estado en español
      estado_consulta_texto: this.getEstadoConsultaTexto(data.estado_consulta),
      tipo_consulta_texto: this.getTipoConsultaTexto(data.tipo_consulta),

      // Prioridad basada en reglas peruanas
      prioridad: this.calculateConsultaPriority(data),
    };
  }

  /**
   * Aplica reglas de negocio específicas para el mercado peruano
   */
  protected async applyBusinessRules(data: any): Promise<any> {
    // Regla 1: Horario de atención peruano
    const horaActual = new Date().getHours();
    const esHorarioAtencion = horaActual >= 8 && horaActual <= 18;

    if (!esHorarioAtencion) {
      data.requiere_atencion = false;
      data.respuesta_automatica =
        'Gracias por contactarnos. Nuestro horario de atención es de 8:00 AM a 6:00 PM. Te responderemos a la brevedad.';
    }

    // Regla 2: Detección automática de urgencia por palabras clave
    const palabrasUrgentes = [
      'urgente',
      'emergencia',
      'problema',
      'reclamo',
      'ayuda',
    ];
    const esUrgente = palabrasUrgentes.some((palabra) =>
      data.mensaje_original?.toLowerCase().includes(palabra),
    );

    if (esUrgente) {
      data.requiere_atencion = true;
      data.tipo_consulta = TipoConsulta.RECLAMO;
    }

    // Regla 3: Asignación automática de tipo según contenido
    if (!data.tipo_consulta) {
      data.tipo_consulta = this.detectTipoConsultaAutomatico(
        data.mensaje_original,
      );
    }

    return data;
  }

  /**
   * Validaciones específicas de reglas de negocio para consultas
   */
  private async validateConsultaBusinessRules(
    dto: CreateConsultaWhatsappDto,
  ): Promise<void> {
    // Validar límite de consultas por cliente por día
    const consultasHoy = await this.prisma.consultaWhatsapp.count({
      where: {
        id_empresa: dto.id_empresa,
        numero_telefono: dto.numero_telefono,
        fecha_consulta: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    if (consultasHoy >= 10) {
      this.logger.warn(
        `Cliente ${dto.numero_telefono} ha excedido el límite de consultas diarias`,
      );
    }
  }

  /**
   * Validaciones para actualización de consultas
   */
  private async validateConsultaUpdateRules(
    id: number,
    dto: UpdateConsultaWhatsappDto,
  ): Promise<void> {
    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: id },
      select: { estado_consulta: true },
    });

    // No permitir cambios en consultas cerradas
    if (consulta?.estado_consulta === EstadoConsulta.CERRADA) {
      throw new Error('No se puede modificar una consulta cerrada');
    }
  }

  /**
   * Aplica lógica de negocio específica para consultas
   */
  private applyConsultaBusinessLogic(data: any): any {
    // Aplicar reglas de negocio síncronas
    return {
      ...data,
      // Generar número de ticket único
      numero_ticket: this.generateTicketNumber(data.id_empresa),

      // Establecer prioridad inicial
      prioridad_inicial: this.calculateInitialPriority(data),
    };
  }

  /**
   * Aplica lógica específica para actualización de consultas
   */
  private applyConsultaUpdateLogic(
    data: any,
    originalDto: UpdateConsultaWhatsappDto,
  ): any {
    // Preservar campos importantes si no se especifican
    if (
      originalDto.estado_consulta === EstadoConsulta.RESPONDIDA &&
      !data.fecha_respuesta
    ) {
      data.fecha_respuesta = new Date();
    }

    return data;
  }

  /**
   * Post-procesamiento específico para cierre de consultas
   */
  private async postProcessConsultaCierre(consulta: any): Promise<void> {
    // Actualizar métricas de satisfacción de la empresa
    if (consulta.satisfaccion) {
      await this.updateEmpresaSatisfactionMetrics(
        consulta.id_empresa,
        consulta.satisfaccion,
      );
    }

    // Enviar notificación de cierre si es necesario
    await this.sendClosureNotificationIfNeeded(consulta);
  }

  /**
   * Valida puntuación de satisfacción
   */
  private validateSatisfaccionScore(satisfaccion: number): void {
    if (satisfaccion < 1 || satisfaccion > 5) {
      throw new Error('La satisfacción debe estar entre 1 y 5');
    }
  }

  /**
   * Formatea número de teléfono peruano
   */
  private formatPeruvianPhone(telefono: string): string {
    if (!telefono) return '';

    const cleaned = telefono.replace(/\D/g, '');

    if (cleaned.startsWith('51')) {
      const number = cleaned.substring(2);
      return `+51 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }

    if (cleaned.length === 9) {
      return `+51 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    }

    return telefono;
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
   * Obtiene texto descriptivo del estado de consulta
   */
  private getEstadoConsultaTexto(estado: EstadoConsulta): string {
    const estados = {
      [EstadoConsulta.NUEVA]: 'Nueva',
      [EstadoConsulta.EN_PROCESO]: 'En Proceso',
      [EstadoConsulta.RESPONDIDA]: 'Respondida',
      [EstadoConsulta.CERRADA]: 'Cerrada',
    };

    return estados[estado] || estado;
  }

  /**
   * Obtiene texto descriptivo del tipo de consulta
   */
  private getTipoConsultaTexto(tipo: TipoConsulta): string {
    const tipos = {
      [TipoConsulta.INFORMACION]: 'Información',
      [TipoConsulta.COTIZACION]: 'Cotización',
      [TipoConsulta.RECLAMO]: 'Reclamo',
      [TipoConsulta.SOPORTE]: 'Soporte',
    };

    return tipos[tipo] || tipo;
  }

  /**
   * Calcula prioridad de consulta basada en reglas peruanas
   */
  private calculateConsultaPriority(consulta: any): 'alta' | 'media' | 'baja' {
    if (consulta.tipo_consulta === TipoConsulta.RECLAMO) {
      return 'alta';
    }

    if (consulta.requiere_atencion) {
      return 'media';
    }

    return 'baja';
  }

  /**
   * Detecta tipo de consulta automáticamente
   */
  private detectTipoConsultaAutomatico(mensaje: string): TipoConsulta {
    if (!mensaje) return TipoConsulta.INFORMACION;

    const mensajeLower = mensaje.toLowerCase();

    if (mensajeLower.includes('cotiz') || mensajeLower.includes('precio')) {
      return TipoConsulta.COTIZACION;
    }

    if (mensajeLower.includes('reclam') || mensajeLower.includes('quej')) {
      return TipoConsulta.RECLAMO;
    }

    if (mensajeLower.includes('ayuda') || mensajeLower.includes('soporte')) {
      return TipoConsulta.SOPORTE;
    }

    return TipoConsulta.INFORMACION;
  }

  /**
   * Genera número de ticket único
   */
  private generateTicketNumber(empresaId: number): string {
    const fecha = new Date();
    const timestamp = fecha.getTime().toString().slice(-6);
    return `WA-${empresaId}-${timestamp}`;
  }

  /**
   * Calcula prioridad inicial
   */
  private calculateInitialPriority(data: any): number {
    let prioridad = 1;

    if (data.tipo_consulta === TipoConsulta.RECLAMO) prioridad += 2;
    if (data.requiere_atencion) prioridad += 1;

    return Math.min(prioridad, 5);
  }

  /**
   * Actualiza métricas de satisfacción de la empresa
   */
  private async updateEmpresaSatisfactionMetrics(
    empresaId: number,
    satisfaccion: number,
  ): Promise<void> {
    // Implementar actualización de métricas de satisfacción
    this.logger.log(
      `Actualizando métricas de satisfacción para empresa ${empresaId}: ${satisfaccion}`,
    );
  }

  /**
   * Envía notificación de cierre si es necesario
   */
  private async sendClosureNotificationIfNeeded(consulta: any): Promise<void> {
    // Implementar envío de notificación de cierre
    this.logger.log(
      `Enviando notificación de cierre para consulta ${consulta.id_consulta}`,
    );
  }
}
