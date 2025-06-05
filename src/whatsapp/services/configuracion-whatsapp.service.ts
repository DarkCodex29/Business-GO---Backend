import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappValidationService } from './whatsapp-validation.service';
import { WhatsappCalculationService } from './whatsapp-calculation.service';
import { CreateConfiguracionWhatsappDto } from '../dto/create-configuracion-whatsapp.dto';
import { UpdateConfiguracionWhatsappDto } from '../dto/update-configuracion-whatsapp.dto';

/**
 * Servicio especializado para gestión de configuración de WhatsApp
 * Principio: Single Responsibility - Solo maneja configuración
 * Contexto: Específico para el mercado peruano
 */
@Injectable()
export class ConfiguracionWhatsappService {
  private readonly logger = new Logger(ConfiguracionWhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: WhatsappValidationService,
    private readonly calculationService: WhatsappCalculationService,
  ) {}

  /**
   * Crea configuración de WhatsApp para una empresa
   * Implementa configuraciones específicas para el mercado peruano
   */
  async createConfiguracion(createConfigDto: CreateConfiguracionWhatsappDto) {
    this.logger.log(
      `Creando configuración WhatsApp para empresa ${createConfigDto.id_empresa}`,
    );

    // Validaciones específicas
    await this.validationService.validateConfiguracionCreation(createConfigDto);

    // Aplicar configuraciones por defecto para Perú
    const configData = this.applyPeruvianDefaults(createConfigDto);

    // Crear configuración en base de datos
    const configuracion = await this.prisma.configuracionWhatsapp.create({
      data: {
        id_empresa: configData.id_empresa,
        numero_whatsapp: configData.numero_whatsapp,
        nombre_negocio: configData.nombre_negocio,
        mensaje_bienvenida: configData.mensaje_bienvenida,
        mensaje_ausencia: configData.mensaje_ausencia,
        mensaje_despedida: configData.mensaje_despedida,
        horario_atencion: configData.horario_atencion,
        respuestas_automaticas: configData.respuestas_automaticas ?? true,
        ia_habilitada: configData.ia_habilitada ?? false,
        webhook_url: configData.webhook_url,
        token_api: configData.token_api,
        instancia_id: configData.instancia_id,
        activo: configData.activo ?? true,
      },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
            telefono: true,
          },
        },
      },
    });

    // Post-procesamiento
    await this.postProcessConfiguracionCreation(configuracion);

    this.logger.log(
      `Configuración WhatsApp creada exitosamente para empresa ${createConfigDto.id_empresa}`,
    );
    return this.formatPeruvianResponse(configuracion);
  }

  /**
   * Obtiene configuración de WhatsApp por empresa
   */
  async findConfiguracionByEmpresa(empresaId: number) {
    this.logger.log(
      `Obteniendo configuración WhatsApp para empresa ${empresaId}`,
    );

    const configuracion = await this.prisma.configuracionWhatsapp.findUnique({
      where: { id_empresa: empresaId },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
            telefono: true,
          },
        },
      },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de WhatsApp no encontrada para empresa ${empresaId}`,
      );
    }

    return this.formatPeruvianResponse(configuracion);
  }

  /**
   * Actualiza configuración de WhatsApp
   */
  async updateConfiguracion(
    empresaId: number,
    updateConfigDto: UpdateConfiguracionWhatsappDto,
  ) {
    this.logger.log(
      `Actualizando configuración WhatsApp para empresa ${empresaId}`,
    );

    // Verificar que existe la configuración
    await this.verifyConfiguracionExists(empresaId);

    // Validaciones específicas para actualización
    await this.validateConfiguracionUpdate(empresaId, updateConfigDto);

    // Aplicar lógica de actualización
    const updateData = this.applyUpdateLogic(updateConfigDto);

    const configuracion = await this.prisma.configuracionWhatsapp.update({
      where: { id_empresa: empresaId },
      data: updateData,
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
            telefono: true,
          },
        },
      },
    });

    // Post-procesamiento de actualización
    await this.postProcessConfiguracionUpdate(configuracion);

    this.logger.log(
      `Configuración WhatsApp actualizada exitosamente para empresa ${empresaId}`,
    );
    return this.formatPeruvianResponse(configuracion);
  }

  /**
   * Activa o desactiva la configuración de WhatsApp
   */
  async toggleConfiguracionStatus(empresaId: number, activo: boolean) {
    this.logger.log(
      `${activo ? 'Activando' : 'Desactivando'} configuración WhatsApp para empresa ${empresaId}`,
    );

    await this.verifyConfiguracionExists(empresaId);

    const configuracion = await this.prisma.configuracionWhatsapp.update({
      where: { id_empresa: empresaId },
      data: {
        activo,
        fecha_actualizacion: new Date(),
      },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
          },
        },
      },
    });

    // Registrar cambio de estado
    await this.logStatusChange(empresaId, activo);

    return this.formatPeruvianResponse(configuracion);
  }

  /**
   * Obtiene estado de conexión de la instancia de WhatsApp
   */
  async getEstadoConexion(empresaId: number) {
    this.logger.log(
      `Obteniendo estado de conexión WhatsApp para empresa ${empresaId}`,
    );

    const configuracion = await this.findConfiguracionByEmpresa(empresaId);

    // Simular verificación de estado con Evolution API
    const estadoConexion = await this.checkEvolutionApiStatus(configuracion);

    return {
      empresa_id: empresaId,
      estado_conexion: estadoConexion.estado,
      ultimo_ping: estadoConexion.ultimo_ping,
      tiempo_activo: estadoConexion.tiempo_activo,
      instancia_activa: configuracion.activo,
      configuracion_valida: this.validateConfigurationIntegrity(configuracion),
    };
  }

  /**
   * Obtiene métricas de configuración para dashboard
   */
  async getMetricasConfiguracion(empresaId: number) {
    this.logger.log(
      `Obteniendo métricas de configuración para empresa ${empresaId}`,
    );

    const configuracion = await this.findConfiguracionByEmpresa(empresaId);

    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 30); // Últimos 30 días

    const metricas = await this.calculationService.calculateMetricasDiarias(
      empresaId,
      new Date(),
    );

    return {
      configuracion_info: {
        activa: configuracion.activo,
        fecha_creacion: configuracion.fecha_creacion,
        ultima_actualizacion: configuracion.fecha_actualizacion,
        horario_atencion:
          configuracion.horario_atencion &&
          typeof configuracion.horario_atencion === 'object' &&
          configuracion.horario_atencion.inicio &&
          configuracion.horario_atencion.fin
            ? `${configuracion.horario_atencion.inicio} - ${configuracion.horario_atencion.fin}`
            : 'No configurado',
        dias_atencion:
          configuracion.horario_atencion &&
          typeof configuracion.horario_atencion === 'object' &&
          configuracion.horario_atencion.dias
            ? configuracion.horario_atencion.dias
            : [],
      },
      metricas_uso: metricas,
      estado_salud: this.calculateHealthScore(configuracion, metricas),
    };
  }

  /**
   * Reinicia la conexión de WhatsApp
   */
  async reiniciarConexion(empresaId: number) {
    this.logger.log(`Reiniciando conexión WhatsApp para empresa ${empresaId}`);

    const configuracion = await this.findConfiguracionByEmpresa(empresaId);

    // Simular reinicio de conexión con Evolution API
    const resultado = await this.restartEvolutionApiConnection(configuracion);

    // Actualizar estado de conexión
    await this.prisma.configuracionWhatsapp.update({
      where: { id_empresa: empresaId },
      data: {
        activo: true,
        fecha_actualizacion: new Date(),
      },
    });

    return {
      empresa_id: empresaId,
      reinicio_exitoso: resultado.exitoso,
      mensaje: resultado.mensaje,
      fecha_reinicio: new Date(),
    };
  }

  /**
   * Aplica configuraciones por defecto para el mercado peruano
   */
  private applyPeruvianDefaults(dto: CreateConfiguracionWhatsappDto): any {
    return {
      ...dto,
      // Horario de atención usando el objeto del DTO
      horario_atencion: dto.horario_atencion || {
        inicio: '08:00',
        fin: '18:00',
        dias: ['L', 'M', 'X', 'J', 'V'],
      },

      // Mensajes por defecto en español peruano
      mensaje_bienvenida:
        dto.mensaje_bienvenida ||
        '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?',

      mensaje_ausencia:
        dto.mensaje_ausencia ||
        'Gracias por escribirnos. Nuestro horario de atención es de lunes a viernes de 8:00 AM a 6:00 PM. Te responderemos a la brevedad.',

      mensaje_despedida:
        dto.mensaje_despedida ||
        'Gracias por contactarnos. ¡Que tengas un excelente día!',

      // Configuración de respuestas automáticas
      respuestas_automaticas: dto.respuestas_automaticas ?? true,
      ia_habilitada: dto.ia_habilitada ?? false,

      // Configuración de webhook y API
      webhook_url: dto.webhook_url,
      token_api: dto.token_api,
      instancia_id: dto.instancia_id,
    };
  }

  /**
   * Valida configuración para actualización
   */
  private async validateConfiguracionUpdate(
    empresaId: number,
    dto: UpdateConfiguracionWhatsappDto,
  ): Promise<void> {
    // Validar que no se esté cambiando el token si hay consultas activas
    if (dto.token_api) {
      const consultasActivas = await this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          estado_consulta: {
            in: ['NUEVA', 'EN_PROCESO'],
          },
        },
      });

      if (consultasActivas > 0) {
        this.logger.warn(
          `Empresa ${empresaId} tiene ${consultasActivas} consultas activas. Cambio de token requiere precaución.`,
        );
      }
    }
  }

  /**
   * Aplica lógica de actualización
   */
  private applyUpdateLogic(dto: UpdateConfiguracionWhatsappDto): any {
    const updateData: any = { ...dto };

    // Siempre actualizar fecha de modificación
    updateData.fecha_actualizacion = new Date();

    // Si se cambia el token, actualizar fecha
    if (dto.token_api) {
      updateData.fecha_actualizacion = new Date();
    }

    return updateData;
  }

  /**
   * Verifica que existe la configuración
   */
  private async verifyConfiguracionExists(empresaId: number): Promise<void> {
    const configuracion = await this.prisma.configuracionWhatsapp.findUnique({
      where: { id_empresa: empresaId },
      select: { id_empresa: true },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de WhatsApp no encontrada para empresa ${empresaId}`,
      );
    }
  }

  /**
   * Post-procesamiento después de crear configuración
   */
  private async postProcessConfiguracionCreation(
    configuracion: any,
  ): Promise<void> {
    // Crear registro de auditoría
    this.logger.log(
      `Configuración WhatsApp creada para empresa ${configuracion.id_empresa}`,
    );

    // Inicializar métricas base
    await this.initializeBaseMetrics(configuracion.id_empresa);
  }

  /**
   * Post-procesamiento después de actualizar configuración
   */
  private async postProcessConfiguracionUpdate(
    configuracion: any,
  ): Promise<void> {
    // Registrar cambio en auditoría
    this.logger.log(
      `Configuración WhatsApp actualizada para empresa ${configuracion.id_empresa}`,
    );
  }

  /**
   * Registra cambio de estado
   */
  private async logStatusChange(
    empresaId: number,
    activo: boolean,
  ): Promise<void> {
    this.logger.log(
      `Estado de configuración WhatsApp cambiado para empresa ${empresaId}: ${activo ? 'ACTIVO' : 'INACTIVO'}`,
    );
  }

  /**
   * Verifica estado con Evolution API
   */
  private async checkEvolutionApiStatus(configuracion: any): Promise<any> {
    // Simular verificación con Evolution API
    // En implementación real, hacer llamada HTTP a Evolution API
    return {
      estado: configuracion.activo ? 'conectado' : 'desconectado',
      ultimo_ping: new Date(),
      tiempo_activo: '2h 30m',
    };
  }

  /**
   * Valida integridad de la configuración
   */
  private validateConfigurationIntegrity(configuracion: any): boolean {
    return !!(
      configuracion.token_api &&
      configuracion.numero_whatsapp &&
      configuracion.instancia_id
    );
  }

  /**
   * Calcula puntuación de salud de la configuración
   */
  private calculateHealthScore(configuracion: any, metricas: any): number {
    let score = 0;

    // Configuración completa (+30 puntos)
    if (this.validateConfigurationIntegrity(configuracion)) score += 30;

    // Configuración activa (+20 puntos)
    if (configuracion.activo) score += 20;

    // Mensajes configurados (+20 puntos)
    if (configuracion.mensaje_bienvenida && configuracion.mensaje_ausencia)
      score += 20;

    // Horarios configurados (+15 puntos)
    if (
      configuracion.horario_atencion &&
      typeof configuracion.horario_atencion === 'object' &&
      configuracion.horario_atencion.inicio &&
      configuracion.horario_atencion.fin
    )
      score += 15;

    // Actividad reciente (+15 puntos)
    if (metricas.consultas_totales > 0) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Reinicia conexión con Evolution API
   */
  private async restartEvolutionApiConnection(
    configuracion: any,
  ): Promise<any> {
    // Simular reinicio de conexión
    // En implementación real, hacer llamadas a Evolution API
    return {
      exitoso: true,
      mensaje: 'Conexión reiniciada exitosamente',
    };
  }

  /**
   * Inicializa métricas base para nueva configuración
   */
  private async initializeBaseMetrics(empresaId: number): Promise<void> {
    // Inicializar métricas base si es necesario
    this.logger.log(`Inicializando métricas base para empresa ${empresaId}`);
  }

  /**
   * Formatea respuesta para contexto peruano
   */
  private formatPeruvianResponse(data: any): any {
    if (!data) return data;

    return {
      ...data,
      // Formatear teléfono peruano
      numero_telefono_formateado: this.formatPeruvianPhone(
        data.numero_whatsapp,
      ),

      // Formatear fechas para zona horaria peruana
      fecha_creacion_peru: this.formatPeruvianDateTime(data.fecha_creacion),
      fecha_actualizacion_peru: data.fecha_actualizacion
        ? this.formatPeruvianDateTime(data.fecha_actualizacion)
        : null,

      // Estado en español
      estado_texto: data.activo ? 'Activo' : 'Inactivo',

      // Horario formateado
      horario_atencion_texto:
        data.horario_atencion &&
        typeof data.horario_atencion === 'object' &&
        data.horario_atencion.inicio &&
        data.horario_atencion.fin
          ? `${data.horario_atencion.inicio} - ${data.horario_atencion.fin}`
          : 'No configurado',

      // Días de atención en español
      dias_atencion_texto: this.formatDiasAtencion(
        data.horario_atencion &&
          typeof data.horario_atencion === 'object' &&
          data.horario_atencion.dias
          ? data.horario_atencion.dias
          : [],
      ),
    };
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
   * Formatea días de atención en español
   */
  private formatDiasAtencion(dias: string[]): string {
    if (!dias || dias.length === 0) return 'No configurado';

    const diasEspanol = {
      L: 'Lunes',
      M: 'Martes',
      X: 'Miércoles',
      J: 'Jueves',
      V: 'Viernes',
      S: 'Sábado',
      D: 'Domingo',
      lunes: 'Lunes',
      martes: 'Martes',
      miercoles: 'Miércoles',
      jueves: 'Jueves',
      viernes: 'Viernes',
      sabado: 'Sábado',
      domingo: 'Domingo',
    };

    return dias.map((dia) => diasEspanol[dia] || dia).join(', ');
  }
}
