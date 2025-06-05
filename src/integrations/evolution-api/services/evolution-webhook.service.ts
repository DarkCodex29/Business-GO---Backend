import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EvolutionApiService } from './evolution-api.service';
import {
  EvolutionBusinessQueryService,
  EmpresarioInfo,
} from './evolution-business-query.service';
import { EvolutionAuthService } from './evolution-auth.service';
import { EvolutionMessageFormatterService } from './evolution-message-formatter.service';
import { EvolutionWhatsappBridgeService } from './evolution-whatsapp-bridge.service';
import {
  TipoMensajeQueue,
  EstadoMensaje,
  TipoIntegracion,
} from '@prisma/client';

@Injectable()
export class EvolutionWebhookService {
  private readonly logger = new Logger(EvolutionWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionApi: EvolutionApiService,
    private readonly businessQuery: EvolutionBusinessQueryService,
    private readonly authService: EvolutionAuthService,
    private readonly formatter: EvolutionMessageFormatterService,
    private readonly bridgeService: EvolutionWhatsappBridgeService,
  ) {}

  /**
   * Valida el token del webhook
   */
  async validateWebhookToken(
    token: string,
    instanceName: string,
  ): Promise<boolean> {
    try {
      const config = await this.prisma.webhookConfiguration.findFirst({
        where: {
          url: { contains: instanceName },
          activo: true,
        },
      });

      return config?.secreto === token;
    } catch (error) {
      this.logger.error('Error validando token de webhook:', error);
      return false;
    }
  }

  /**
   * Maneja mensajes entrantes de WhatsApp
   */
  async handleIncomingMessage(
    instanceName: string,
    payload: any,
  ): Promise<void> {
    try {
      const { data } = payload;

      // Extraer información del mensaje
      const phoneNumber = this.extractPhoneNumber(data.key?.remoteJid);
      const messageText = this.extractMessageText(data.message);
      const senderName = data.pushName || 'Usuario';

      if (!phoneNumber || !messageText) {
        this.logger.debug('Mensaje sin número o texto válido, ignorando');
        return;
      }

      this.logger.log(`Mensaje recibido de ${phoneNumber}: ${messageText}`);

      // Identificar la empresa asociada a la instancia
      const empresa = await this.getEmpresaByInstance(instanceName);
      if (!empresa) {
        this.logger.warn(
          `No se encontró empresa para instancia: ${instanceName}`,
        );
        return;
      }

      // 🔗 REGISTRO EN SISTEMA WHATSAPP (Bridge Integration)
      const messageData = {
        from: phoneNumber,
        body: messageText,
        timestamp: Math.floor(Date.now() / 1000),
        messageId: data.key?.id || `msg_${Date.now()}`,
        instanceName: instanceName,
      };

      // Determinar si es consulta empresarial o de cliente y registrar en WhatsApp module
      await this.processMessage(
        empresa.id_empresa,
        phoneNumber,
        messageText,
        instanceName,
        senderName,
        messageData,
      );
    } catch (error) {
      this.logger.error('Error procesando mensaje entrante:', error);
    }
  }

  /**
   * Procesa el mensaje y determina el flujo apropiado - SIMPLIFICADO
   */
  private async processMessage(
    empresaId: number,
    phoneNumber: string,
    messageText: string,
    instanceName: string,
    senderName: string,
    messageData: any,
  ): Promise<void> {
    // 🔍 PASO 1: Identificar automáticamente por número de teléfono
    const empresarioInfo =
      await this.businessQuery.identificarEmpresario(phoneNumber);

    if (empresarioInfo) {
      // ✅ ES EMPRESARIO REGISTRADO
      this.logger.log(
        `📱 EMPRESARIO DETECTADO: ${empresarioInfo.nombre} (${phoneNumber})`,
      );

      // Registrar en WhatsApp module como consulta empresarial
      const tipoConsulta = this.bridgeService.mapearTipoConsulta(
        messageText,
        true,
      );
      await this.bridgeService.registrarConsultaEmpresario(
        messageData,
        {
          id_usuario: empresarioInfo.id_usuario,
          id_empresa: empresarioInfo.empresas[0]?.id_empresa || empresaId,
          nombre: empresarioInfo.nombre,
          telefono: empresarioInfo.telefono,
        },
        tipoConsulta,
      );

      await this.handleBusinessFlow(
        empresarioInfo,
        empresaId,
        messageText,
        instanceName,
      );
    } else {
      // 👤 ES CLIENTE NORMAL
      this.logger.log(`👤 CLIENTE DETECTADO: ${senderName} (${phoneNumber})`);

      // Registrar en WhatsApp module como consulta cliente
      const tipoConsulta = this.bridgeService.mapearTipoConsulta(
        messageText,
        false,
      );
      await this.bridgeService.registrarConsultaCliente(
        messageData,
        { nombre: senderName },
        tipoConsulta,
      );

      await this.handleClientFlow(
        empresaId,
        phoneNumber,
        messageText,
        senderName,
      );
    }
  }

  /**
   * Flujo EMPRESARIAL: Autenticación + n8n con contexto
   */
  private async handleBusinessFlow(
    empresarioInfo: EmpresarioInfo,
    empresaId: number,
    messageText: string,
    instanceName: string,
  ): Promise<void> {
    const phoneNumber = empresarioInfo.telefono;
    const mensaje = messageText.toLowerCase().trim();

    // 🔐 Verificar si ya está autenticado
    const sesionActiva =
      await this.authService.verificarSesionActiva(phoneNumber);

    if (!sesionActiva) {
      // ❌ No autenticado → Flujo de autenticación
      await this.handleAuthenticationFlow(phoneNumber, mensaje, instanceName);
      return;
    }

    // ✅ YA AUTENTICADO → Obtener empresa activa
    const sesion = await this.authService.obtenerSesion(phoneNumber);
    const empresaSeleccionada =
      sesion?.empresaId || empresarioInfo.empresas[0]?.id_empresa;

    if (!empresaSeleccionada) {
      // 🏢 Múltiples empresas → Seleccionar
      await this.handleEmpresaSelection(
        empresarioInfo,
        phoneNumber,
        mensaje,
        instanceName,
      );
      return;
    }

    // 🚀 DELEGAR A N8N CON CONTEXTO EMPRESARIAL
    await this.delegateToN8nBusiness(
      empresarioInfo,
      empresaSeleccionada,
      messageText,
      phoneNumber,
      instanceName,
    );
  }

  /**
   * Flujo CLIENTE: Directo a n8n público
   */
  private async handleClientFlow(
    empresaId: number,
    phoneNumber: string,
    messageText: string,
    senderName: string,
  ): Promise<void> {
    // 🚀 DELEGAR DIRECTO A N8N PÚBLICO
    await this.prisma.businessEvent.create({
      data: {
        empresa: { connect: { id_empresa: empresaId } },
        tipo_evento: 'whatsapp_client_message',
        entidad: 'consulta',
        entidad_id: 0, // Temporal, sin ID específico para clientes anónimos
        datos: {
          phoneNumber,
          messageText,
          senderName,
          timestamp: new Date(),
        },
      },
    });

    this.logger.log(
      `🚀 CLIENTE → n8n público: ${phoneNumber} - "${messageText}"`,
    );
  }

  /**
   * Delegar a n8n CON contexto empresarial
   */
  private async delegateToN8nBusiness(
    empresarioInfo: EmpresarioInfo,
    empresaId: number,
    originalMessage: string,
    phoneNumber: string,
    instanceName: string,
  ): Promise<void> {
    const empresaInfo = empresarioInfo.empresas.find(
      (e) => e.id_empresa === empresaId,
    );
    const businessToken = await this.generateBusinessToken(
      empresarioInfo.id_usuario,
      empresaId,
    );

    // 🚀 CREAR EVENTO EMPRESARIAL PARA N8N
    await this.prisma.businessEvent.create({
      data: {
        empresa: { connect: { id_empresa: empresaId } },
        tipo_evento: 'whatsapp_business_query',
        entidad: 'consulta_empresarial',
        entidad_id: empresarioInfo.id_usuario,
        datos: {
          phoneNumber,
          originalMessage,
          instanceName,
          // 🔑 CONTEXTO EMPRESARIAL COMPLETO
          businessContext: {
            userId: empresarioInfo.id_usuario,
            userName: empresarioInfo.nombre,
            empresaId: empresaId,
            empresaNombre: empresaInfo?.nombre,
            userRole: empresaInfo?.cargo,
            isOwner: empresaInfo?.es_dueno,
            permissions: empresaInfo?.permisos || [],
            businessToken: businessToken,
            tokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          },
          timestamp: new Date(),
        },
      },
    });

    this.logger.log(
      `🚀 EMPRESARIO → n8n empresarial: ${empresarioInfo.nombre} (${empresaId}) - "${originalMessage}"`,
    );
  }

  /**
   * Genera token temporal para que n8n acceda APIs empresariales
   */
  private async generateBusinessToken(
    userId: number,
    empresaId: number,
  ): Promise<string> {
    // Token simple para demo - en producción usar JWT
    const token = `business_${userId}_${empresaId}_${Date.now()}`;

    // Guardar en cache temporal (Redis en producción)
    // Por ahora simulamos con Map en memoria
    this.businessTokens.set(token, {
      userId,
      empresaId,
      expiry: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    });

    return token;
  }

  // Cache temporal de tokens (en producción usar Redis)
  private businessTokens = new Map<
    string,
    {
      userId: number;
      empresaId: number;
      expiry: Date;
    }
  >();

  /**
   * Valida token empresarial para APIs (usado por endpoints del backend)
   */
  async validateBusinessToken(token: string): Promise<{
    userId: number;
    empresaId: number;
  } | null> {
    const tokenData = this.businessTokens.get(token);

    if (!tokenData || new Date() > tokenData.expiry) {
      this.businessTokens.delete(token);
      return null;
    }

    return {
      userId: tokenData.userId,
      empresaId: tokenData.empresaId,
    };
  }

  /**
   * Maneja el flujo de autenticación
   */
  private async handleAuthenticationFlow(
    phoneNumber: string,
    mensaje: string,
    instanceName: string,
  ): Promise<void> {
    // Si ya está en proceso de autenticación, validar código
    const sesionExistente = await this.authService.obtenerSesion(phoneNumber);

    if (sesionExistente && !sesionExistente.verificado) {
      // Validar código ingresado
      const esValido = await this.authService.validarCodigo(
        phoneNumber,
        mensaje,
      );

      if (esValido) {
        const empresarioInfo =
          await this.businessQuery.identificarEmpresario(phoneNumber);

        if (empresarioInfo && empresarioInfo.empresas.length === 1) {
          // Una sola empresa, seleccionar automáticamente
          await this.authService.asociarEmpresa(
            phoneNumber,
            empresarioInfo.empresas[0].id_empresa,
          );
          await this.sendMessage(
            instanceName,
            phoneNumber,
            `✅ *Autenticado exitosamente*\n\n` +
              `Empresa: ${empresarioInfo.empresas[0].nombre}\n\n` +
              `Escribe "ayuda" para ver los comandos disponibles.`,
          );
        } else if (empresarioInfo) {
          // Múltiples empresas, solicitar selección
          const mensaje = this.formatter.formatearSeleccionEmpresa(
            empresarioInfo.empresas,
          );
          await this.sendMessage(instanceName, phoneNumber, mensaje);
        }
      } else {
        await this.sendMessage(
          instanceName,
          phoneNumber,
          '❌ Código incorrecto. Intenta nuevamente o escribe "cancelar".',
        );
      }
      return;
    }

    // Comando para cancelar
    if (mensaje === 'cancelar') {
      await this.authService.cerrarSesion(phoneNumber);
      await this.sendMessage(
        instanceName,
        phoneNumber,
        '❌ Autenticación cancelada. Escribe cualquier mensaje para volver a intentar.',
      );
      return;
    }

    // Generar nuevo código de verificación
    const codigo =
      await this.authService.generarCodigoVerificacion(phoneNumber);
    const mensajeAuth = this.formatter.formatearMensajeAutenticacion(codigo);

    await this.sendMessage(instanceName, phoneNumber, mensajeAuth);
  }

  /**
   * Maneja la selección de empresa
   */
  private async handleEmpresaSelection(
    empresarioInfo: EmpresarioInfo,
    phoneNumber: string,
    mensaje: string,
    instanceName: string,
  ): Promise<void> {
    if (mensaje === 'cancelar') {
      await this.authService.cerrarSesion(phoneNumber);
      await this.sendMessage(instanceName, phoneNumber, '❌ Sesión cancelada.');
      return;
    }

    const numeroEmpresa = parseInt(mensaje);

    if (
      isNaN(numeroEmpresa) ||
      numeroEmpresa < 1 ||
      numeroEmpresa > empresarioInfo.empresas.length
    ) {
      await this.sendMessage(
        instanceName,
        phoneNumber,
        '❌ Número de empresa inválido. Responde con el número correspondiente (1, 2, 3...)',
      );
      return;
    }

    const empresaSeleccionada = empresarioInfo.empresas[numeroEmpresa - 1];
    await this.authService.asociarEmpresa(
      phoneNumber,
      empresaSeleccionada.id_empresa,
    );

    await this.sendMessage(
      instanceName,
      phoneNumber,
      `✅ *Empresa seleccionada*\n\n` +
        `${empresaSeleccionada.nombre}\n` +
        `Cargo: ${empresaSeleccionada.cargo}\n\n` +
        `Escribe "ayuda" para ver los comandos disponibles.`,
    );
  }

  /**
   * Detecta el tipo de consulta basado en el mensaje
   */
  private detectQueryType(mensaje: string): string {
    if (mensaje.includes('stock') || mensaje.includes('inventario'))
      return 'stock';
    if (
      mensaje.includes('trabajador') ||
      mensaje.includes('personal') ||
      mensaje.includes('empleado')
    )
      return 'trabajadores';
    if (mensaje.includes('venta') || mensaje.includes('ingreso'))
      return 'ventas';
    if (mensaje.includes('resumen') || mensaje.includes('dashboard'))
      return 'resumen';
    return 'general';
  }

  /**
   * Obtiene la empresa asociada a una instancia
   */
  private async getEmpresaByInstance(instanceName: string) {
    return await this.prisma.empresa.findFirst({
      where: {
        evolution_instance: {
          instance_name: instanceName,
        },
      },
    });
  }

  /**
   * Extrae el número de teléfono del remoteJid
   */
  private extractPhoneNumber(remoteJid: string): string | null {
    if (!remoteJid) return null;

    // Formato: 51987654321@s.whatsapp.net
    const match = remoteJid.match(/^(\d+)@/);
    if (match) {
      const number = match[1];
      // Asegurar formato peruano
      return number.startsWith('51') ? `+${number}` : `+51${number}`;
    }

    return null;
  }

  /**
   * Extrae el texto del mensaje
   */
  private extractMessageText(message: any): string | null {
    if (!message) return null;

    // Texto simple
    if (message.conversation) {
      return message.conversation;
    }

    // Mensaje extendido
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }

    // Otros tipos de mensaje
    if (message.imageMessage?.caption) {
      return message.imageMessage.caption;
    }

    return null;
  }

  /**
   * Envía un mensaje via Evolution API
   */
  private async sendMessage(
    instanceName: string,
    phoneNumber: string,
    text: string,
  ): Promise<void> {
    try {
      await this.evolutionApi.sendTextMessage(instanceName, phoneNumber, text);
    } catch (error) {
      this.logger.error(`Error enviando mensaje a ${phoneNumber}:`, error);
    }
  }

  /**
   * Formatea respuesta específica para un trabajador individual
   */
  private formatearTrabajadorEspecifico(result: any): string {
    if (result.tipo === 'error') {
      return `❌ ${result.mensaje}`;
    }

    const datos = result.datos;

    if (datos.multiple_matches) {
      let mensaje = `👥 *MÚLTIPLES TRABAJADORES ENCONTRADOS*\n\n`;
      datos.trabajadores.forEach((t: any, index: number) => {
        mensaje += `${index + 1}. *${t.nombre}*\n`;
        mensaje += `   Cargo: ${t.cargo || 'Sin cargo'}\n`;
        mensaje += `   Área: ${t.departamento || 'Sin área'}\n\n`;
      });
      mensaje += `📝 Sé más específico con el nombre para obtener detalles.`;
      return mensaje;
    }

    if (datos.single_worker) {
      const t = datos.trabajador;
      let mensaje = `👨‍💼 *${t.nombre.toUpperCase()}*\n\n`;

      mensaje += `💼 *Información Laboral:*\n`;
      mensaje += `• Cargo: ${t.cargo || 'Sin cargo'}\n`;
      mensaje += `• Área: ${t.departamento || 'Sin área'}\n`;
      mensaje += `• Tipo: ${t.es_dueno ? '👑 Dueño' : '👨‍💼 Empleado'}\n`;

      const fechaInicio = new Date(t.fecha_inicio);
      mensaje += `• Desde: ${fechaInicio.toLocaleDateString('es-PE')}\n\n`;

      mensaje += `⏰ *HORARIO DE TRABAJO:*\n`;
      mensaje += `• Entrada: ${t.horario.entrada}\n`;
      mensaje += `• Salida: ${t.horario.salida}\n`;
      mensaje += `• Días: ${t.horario.dias_trabajo.join(', ')}\n`;
      mensaje += `• Contrato: ${t.horario.tipo_contrato}\n\n`;

      mensaje += `📱 *Contacto:*\n`;
      if (t.telefono) mensaje += `• Tel: ${t.telefono}\n`;
      if (t.email) mensaje += `• Email: ${t.email}\n`;

      mensaje += `\n📊 *Estado Actual:*\n`;
      mensaje += `• ${t.estado_actual}\n`;

      if (t.ultimo_acceso) {
        const ultimo = new Date(t.ultimo_acceso);
        mensaje += `• Último acceso: ${ultimo.toLocaleDateString('es-PE')} ${ultimo.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n`;
      }

      return mensaje;
    }

    return '❌ Error procesando información del trabajador.';
  }

  // Métodos adicionales requeridos por el controller
  async handleMessageUpdate(instanceName: string, payload: any): Promise<void> {
    this.logger.debug(`Message update para ${instanceName}:`, payload);
  }

  async handleConnectionUpdate(
    instanceName: string,
    payload: any,
  ): Promise<void> {
    this.logger.debug(`Connection update para ${instanceName}:`, payload);
  }

  async handleQRCodeUpdate(instanceName: string, payload: any): Promise<void> {
    this.logger.debug(`QR Code update para ${instanceName}:`, payload);
  }

  async handleSentMessage(instanceName: string, payload: any): Promise<void> {
    this.logger.debug(`Sent message para ${instanceName}:`, payload);
  }

  async handleTestWebhook(instanceName: string, payload: any): Promise<void> {
    this.logger.log(`Test webhook para ${instanceName}:`, payload);
  }
}
