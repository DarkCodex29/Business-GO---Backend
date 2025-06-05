import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from '../../../whatsapp/services/whatsapp.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificacionesWhatsappBridgeService } from '../../../notificaciones/services/notificaciones-whatsapp-bridge.service';
import { CreateConsultaWhatsappDto } from '../../../whatsapp/dto/create-consulta-whatsapp.dto';
import { CreateMensajeWhatsappDto } from '../../../whatsapp/dto/create-mensaje-whatsapp.dto';
import {
  TipoConsulta,
  EstadoConsulta,
} from '../../../common/enums/estados.enum';

interface EvolutionMessage {
  from: string;
  body: string;
  timestamp: number;
  messageId: string;
  instanceName: string;
}

interface EmpresarioContext {
  id_usuario: number;
  id_empresa: number;
  nombre: string;
  telefono: string;
}

@Injectable()
export class EvolutionWhatsappBridgeService {
  private readonly logger = new Logger(EvolutionWhatsappBridgeService.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
    private readonly notificacionesBridge: NotificacionesWhatsappBridgeService,
  ) {}

  /**
   * Registra conversación de empresario en el sistema WhatsApp
   */
  async registrarConsultaEmpresario(
    message: EvolutionMessage,
    empresario: EmpresarioContext,
    tipoConsulta: TipoConsulta = TipoConsulta.INFORMACION,
  ) {
    try {
      const consultaDto: CreateConsultaWhatsappDto = {
        id_empresa: empresario.id_empresa,
        id_cliente: undefined, // Empresario no es cliente
        numero_telefono: this.limpiarNumero(message.from),
        nombre_contacto: empresario.nombre,
        tipo_consulta: tipoConsulta,
        estado_consulta: EstadoConsulta.EN_PROCESO,
        mensaje_original: message.body,
        respuesta_automatica: undefined,
        procesado_por_ia: true,
        requiere_atencion: false,
        notas_internas: `Consulta automática de empresario vía Evolution API - Instance: ${message.instanceName}`,
      };

      const consulta = await this.whatsappService.createConsulta(consultaDto);

      // Registrar mensaje inicial
      await this.registrarMensaje(consulta.id_consulta, message, 'recibido');

      // NUEVA INTEGRACIÓN: Registrar como notificación automática
      await this.notificacionesBridge.registrarMensajeEntrante(
        undefined, // Empresario no es cliente
        empresario.id_empresa,
        message.body,
        consulta.id_consulta,
        {
          tipo_usuario: 'empresario',
          telefono: message.from,
          instance_name: message.instanceName,
          message_id: message.messageId,
        },
      );

      // Notificar dashboard sobre nueva consulta empresario
      await this.notificarDashboard('nueva_consulta', {
        consultaId: consulta.id_consulta,
        empresaId: empresario.id_empresa,
        tipo: 'empresario',
        mensaje: message.body,
        telefono: message.from,
      });

      this.logger.log(
        `Consulta empresario registrada: ${consulta.id_consulta} con notificación automática`,
      );
      return consulta;
    } catch (error) {
      this.logger.error(
        `Error registrando consulta empresario: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Registra conversación de cliente en el sistema WhatsApp
   */
  async registrarConsultaCliente(
    message: EvolutionMessage,
    clienteInfo?: { id_cliente?: number; nombre?: string },
    tipoConsulta: TipoConsulta = TipoConsulta.INFORMACION,
  ) {
    try {
      // Buscar empresa por número de instancia
      const empresa = await this.buscarEmpresaPorInstancia(
        message.instanceName,
      );

      if (!empresa) {
        this.logger.warn(
          `No se encontró empresa para instancia: ${message.instanceName}`,
        );
        return null;
      }

      const consultaDto: CreateConsultaWhatsappDto = {
        id_empresa: empresa.id_empresa,
        id_cliente: clienteInfo?.id_cliente,
        numero_telefono: this.limpiarNumero(message.from),
        nombre_contacto: clienteInfo?.nombre || 'Cliente WhatsApp',
        tipo_consulta: tipoConsulta,
        estado_consulta: EstadoConsulta.NUEVA,
        mensaje_original: message.body,
        respuesta_automatica: undefined,
        procesado_por_ia: true,
        requiere_atencion: true,
        notas_internas: `Consulta automática de cliente vía Evolution API - Instance: ${message.instanceName}`,
      };

      const consulta = await this.whatsappService.createConsulta(consultaDto);

      // Registrar mensaje inicial
      await this.registrarMensaje(consulta.id_consulta, message, 'recibido');

      // NUEVA INTEGRACIÓN: Registrar como notificación automática
      if (clienteInfo?.id_cliente) {
        await this.notificacionesBridge.registrarMensajeEntrante(
          clienteInfo.id_cliente,
          empresa.id_empresa,
          message.body,
          consulta.id_consulta,
          {
            tipo_usuario: 'cliente',
            telefono: message.from,
            instance_name: message.instanceName,
            message_id: message.messageId,
          },
        );
      }

      // Notificar dashboard sobre nueva consulta cliente
      await this.notificarDashboard('nueva_consulta', {
        consultaId: consulta.id_consulta,
        empresaId: empresa.id_empresa,
        tipo: 'cliente',
        mensaje: message.body,
        telefono: message.from,
      });

      this.logger.log(
        `Consulta cliente registrada: ${consulta.id_consulta} con notificación automática`,
      );
      return consulta;
    } catch (error) {
      this.logger.error(`Error registrando consulta cliente: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registra mensaje en consulta existente
   */
  async registrarMensaje(
    consultaId: number,
    message: EvolutionMessage,
    tipo: 'enviado' | 'recibido',
    respuestaIA?: string,
  ) {
    try {
      const mensajeDto: CreateMensajeWhatsappDto = {
        id_consulta: consultaId,
        mensaje: message.body,
        es_entrante: tipo === 'recibido',
        tipo_mensaje: 'text',
        procesado: true,
        mensaje_id_wa: message.messageId,
      };

      const mensajeCreado =
        await this.whatsappService.createMensaje(mensajeDto);
      this.logger.log(`Mensaje registrado en consulta ${consultaId}`);
      return mensajeCreado;
    } catch (error) {
      this.logger.error(`Error registrando mensaje: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registra respuesta enviada a través de Evolution API
   */
  async registrarRespuestaEnviada(
    consultaId: number,
    respuesta: string,
    messageId: string,
    instanceName: string,
  ) {
    try {
      const mensajeDto: CreateMensajeWhatsappDto = {
        id_consulta: consultaId,
        mensaje: respuesta,
        es_entrante: false,
        tipo_mensaje: 'text',
        procesado: true,
        mensaje_id_wa: messageId,
      };

      const mensaje = await this.whatsappService.createMensaje(mensajeDto);

      // Actualizar estado de consulta si es respuesta automática
      await this.whatsappService.updateConsulta(consultaId, {
        estado_consulta: EstadoConsulta.RESPONDIDA,
        respuesta_automatica: respuesta,
      });

      this.logger.log(`Respuesta registrada para consulta ${consultaId}`);
      return mensaje;
    } catch (error) {
      this.logger.error(`Error registrando respuesta: ${error.message}`);
      throw error;
    }
  }

  /**
   * ENVÍO MANUAL: Dashboard → Evolution API
   * Permite al dashboard enviar respuestas manuales a través de Evolution API
   */
  async enviarRespuestaManual(
    consultaId: number,
    respuesta: string,
    usuarioId?: number,
  ) {
    try {
      // Obtener consulta con datos de empresa
      const consulta = await this.prisma.consultaWhatsapp.findUnique({
        where: { id_consulta: consultaId },
        include: {
          empresa: {
            include: {
              configuracion_whatsapp: true,
            },
          },
        },
      });

      if (!consulta) {
        throw new Error(`Consulta ${consultaId} no encontrada`);
      }

      // Buscar instancia Evolution API para la empresa
      const evolutionInstance = await this.prisma.evolutionInstance.findFirst({
        where: { id_empresa: consulta.id_empresa },
      });

      if (!evolutionInstance) {
        throw new Error(
          `No hay instancia Evolution API configurada para empresa ${consulta.id_empresa}`,
        );
      }

      // TODO: Implementar envío real a través de Evolution API Service
      // const evolutionApiService = new EvolutionApiService();
      // const messageResult = await evolutionApiService.sendMessage(
      //   evolutionInstance.instance_name,
      //   consulta.numero_telefono,
      //   respuesta
      // );

      // Simular envío exitoso por ahora
      const messageId = `manual_${Date.now()}`;

      // Registrar mensaje enviado en el sistema
      const mensaje = await this.registrarMensaje(
        consultaId,
        {
          from: consulta.numero_telefono,
          body: respuesta,
          timestamp: Date.now(),
          messageId,
          instanceName: evolutionInstance.instance_name,
        },
        'enviado',
      );

      // Actualizar estado de consulta
      await this.whatsappService.updateConsulta(consultaId, {
        estado_consulta: EstadoConsulta.RESPONDIDA,
        respuesta_automatica: respuesta,
      });

      this.logger.log(
        `Respuesta manual enviada para consulta ${consultaId} por usuario ${usuarioId}`,
      );

      return {
        success: true,
        messageId,
        consulta: consultaId,
        mensaje: mensaje.id_mensaje,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error enviando respuesta manual: ${error.message}`);
      throw error;
    }
  }

  /**
   * NOTIFICACIONES: Evolution API → Dashboard
   * Notifica al dashboard sobre eventos importantes
   */
  async notificarDashboard(
    tipo: 'nueva_consulta' | 'mensaje_recibido' | 'respuesta_enviada',
    datos: any,
  ) {
    try {
      // Crear evento de business para posible integración con n8n
      await this.prisma.businessEvent.create({
        data: {
          tipo_evento: tipo,
          entidad: 'consulta',
          entidad_id: datos.consultaId || 0,
          datos: datos,
          id_empresa: datos.empresaId || null,
          procesado: false,
          fecha_evento: new Date(),
        },
      });

      // TODO: Implementar notificaciones real-time (WebSockets, Server-Sent Events)
      // Por ahora solo registramos el evento

      this.logger.debug(`Notificación dashboard: ${tipo}`, datos);
    } catch (error) {
      this.logger.error(`Error notificando dashboard: ${error.message}`);
    }
  }

  /**
   * SINCRONIZACIÓN: Mantener sistemas en sync
   * Sincroniza configuraciones entre dashboard y Evolution API
   */
  async sincronizarConfiguracion(empresaId: number) {
    try {
      // Obtener configuración WhatsApp del dashboard
      const configWhatsapp =
        await this.whatsappService.findConfiguracionByEmpresa(empresaId);

      if (!configWhatsapp) {
        this.logger.warn(
          `No hay configuración WhatsApp para empresa ${empresaId}`,
        );
        return;
      }

      // Obtener o crear instancia Evolution API
      let evolutionInstance = await this.prisma.evolutionInstance.findFirst({
        where: { id_empresa: empresaId },
      });

      if (!evolutionInstance) {
        // Crear nueva instancia Evolution API basada en config dashboard
        evolutionInstance = await this.prisma.evolutionInstance.create({
          data: {
            id_empresa: empresaId,
            instance_name: `empresa_${empresaId}_${Date.now()}`,
            webhook_url: `${process.env.BASE_URL}/webhooks/evolution`,
            estado_conexion: 'desconectado',
            configuracion: {
              token_api: configWhatsapp.token_api || '',
              auto_respuesta: configWhatsapp.respuestas_automaticas || false,
            },
          },
        });

        this.logger.log(
          `Instancia Evolution API creada para empresa ${empresaId}: ${evolutionInstance.instance_name}`,
        );
      } else {
        // Actualizar instancia existente con config del dashboard
        await this.prisma.evolutionInstance.update({
          where: { id_instance: evolutionInstance.id_instance },
          data: {
            configuracion: {
              ...((evolutionInstance.configuracion as any) || {}),
              token_api: configWhatsapp.token_api || '',
              auto_respuesta: configWhatsapp.respuestas_automaticas || false,
              updated_at: new Date().toISOString(),
            },
          },
        });

        this.logger.log(
          `Instancia Evolution API actualizada para empresa ${empresaId}`,
        );
      }

      return evolutionInstance;
    } catch (error) {
      this.logger.error(
        `Error sincronizando configuración empresa ${empresaId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Busca consulta activa por número de teléfono
   */
  async buscarConsultaActiva(numeroTelefono: string, empresaId?: number) {
    try {
      const numero = this.limpiarNumero(numeroTelefono);

      const consulta = await this.prisma.consultaWhatsapp.findFirst({
        where: {
          numero_telefono: numero,
          estado_consulta: {
            in: [EstadoConsulta.NUEVA, EstadoConsulta.EN_PROCESO],
          },
          ...(empresaId && { id_empresa: empresaId }),
        },
        orderBy: {
          fecha_consulta: 'desc',
        },
        include: {
          empresa: true,
          cliente: true,
        },
      });

      return consulta;
    } catch (error) {
      this.logger.error(`Error buscando consulta activa: ${error.message}`);
      return null;
    }
  }

  /**
   * Mapea tipo de consulta según el contenido del mensaje
   */
  mapearTipoConsulta(mensaje: string, esEmpresario: boolean): TipoConsulta {
    const mensajeLower = mensaje.toLowerCase();

    if (esEmpresario) {
      if (
        mensajeLower.includes('stock') ||
        mensajeLower.includes('inventario')
      ) {
        return TipoConsulta.SOPORTE;
      }
      if (mensajeLower.includes('venta') || mensajeLower.includes('vender')) {
        return TipoConsulta.PEDIDO;
      }
      if (
        mensajeLower.includes('empleado') ||
        mensajeLower.includes('trabajador')
      ) {
        return TipoConsulta.INFORMACION;
      }
    } else {
      if (mensajeLower.includes('precio') || mensajeLower.includes('costo')) {
        return TipoConsulta.COTIZACION;
      }
      if (
        mensajeLower.includes('producto') ||
        mensajeLower.includes('catalogo')
      ) {
        return TipoConsulta.CATALOGO;
      }
      if (mensajeLower.includes('comprar') || mensajeLower.includes('pedido')) {
        return TipoConsulta.PEDIDO;
      }
    }

    return TipoConsulta.INFORMACION;
  }

  /**
   * Busca empresa por nombre de instancia Evolution
   */
  private async buscarEmpresaPorInstancia(instanceName: string) {
    try {
      // Buscar en configuración de Evolution API
      const instance = await this.prisma.evolutionInstance.findUnique({
        where: { instance_name: instanceName },
        include: { empresa: true },
      });

      return instance?.empresa || null;
    } catch (error) {
      this.logger.error(
        `Error buscando empresa por instancia: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Limpia y formatea número de teléfono
   */
  private limpiarNumero(numero: string): string {
    // Remover caracteres especiales y espacios
    let clean = numero.replace(/[^\d+]/g, '');

    // Si no tiene código de país, agregar +51 (Perú)
    if (!clean.startsWith('+')) {
      if (clean.length === 9) {
        clean = '+51' + clean;
      } else if (clean.length === 11 && clean.startsWith('51')) {
        clean = '+' + clean;
      }
    }

    return clean;
  }
}
