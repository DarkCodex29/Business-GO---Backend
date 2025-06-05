import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from './notificaciones.service';
import {
  CreateNotificacionDto,
  TipoNotificacion,
} from '../dto/create-notificacion.dto';
import {
  TipoAccion,
  TipoRecurso,
} from '../../auditoria/dto/create-auditoria.dto';

export interface WhatsAppNotificacionData {
  clienteId: number;
  empresaId: number;
  mensaje: string;
  consultaId?: number;
  mensajeId?: number;
  tipo: 'entrada' | 'salida' | 'automatica';
  metadata?: Record<string, any>;
}

export interface NotificacionWhatsAppResponse {
  notificacion: any;
  auditoria: any;
}

@Injectable()
export class NotificacionesWhatsappBridgeService {
  private readonly logger = new Logger(
    NotificacionesWhatsappBridgeService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Crear notificación de WhatsApp con auditoría automática
   * Unifica el sistema de notificaciones con WhatsApp
   */
  async createWhatsAppNotificacion(
    data: WhatsAppNotificacionData,
  ): Promise<NotificacionWhatsAppResponse> {
    this.logger.log(
      `Creando notificación WhatsApp para cliente ${data.clienteId} en empresa ${data.empresaId}`,
    );

    try {
      // 1. Preparar DTO de notificación
      const notificacionDto: CreateNotificacionDto = {
        tipo: TipoNotificacion.WHATSAPP,
        titulo: this.generateTituloByTipo(data.tipo),
        contenido: data.mensaje,
        datosAdicionales: JSON.stringify({
          consulta_id: data.consultaId,
          mensaje_id: data.mensajeId,
          tipo_whatsapp: data.tipo,
          ...data.metadata,
        }),
      };

      // 2. Crear notificación
      const notificacion = await this.notificacionesService.create(
        data.empresaId,
        data.clienteId,
        notificacionDto,
      );

      // 3. Crear auditoría automática
      const auditoria = await this.createAuditoriaWhatsApp(data, notificacion);

      this.logger.log(
        `Notificación WhatsApp ${notificacion.id_notificacion} creada con auditoría ${auditoria.id}`,
      );

      return {
        notificacion,
        auditoria,
      };
    } catch (error) {
      this.logger.error(
        `Error creando notificación WhatsApp: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Registrar mensaje entrante de WhatsApp como notificación
   */
  async registrarMensajeEntrante(
    clienteId: number | undefined,
    empresaId: number,
    mensaje: string,
    consultaId: number,
    metadata?: Record<string, any>,
  ): Promise<NotificacionWhatsAppResponse> {
    return await this.createWhatsAppNotificacion({
      clienteId: clienteId || 0, // Usar 0 como fallback para empresarios/usuarios no-cliente
      empresaId,
      mensaje,
      consultaId,
      tipo: 'entrada',
      metadata: {
        origen: 'webhook_evolution',
        automatico: true,
        ...metadata,
      },
    });
  }

  /**
   * Registrar respuesta manual del dashboard como notificación
   */
  async registrarRespuestaManual(
    clienteId: number,
    empresaId: number,
    mensaje: string,
    consultaId: number,
    usuarioId: string,
    metadata?: Record<string, any>,
  ): Promise<NotificacionWhatsAppResponse> {
    return await this.createWhatsAppNotificacion({
      clienteId,
      empresaId,
      mensaje,
      consultaId,
      tipo: 'salida',
      metadata: {
        origen: 'dashboard_manual',
        usuario_id: usuarioId,
        automatico: false,
        ...metadata,
      },
    });
  }

  /**
   * Registrar mensaje automático de n8n como notificación
   */
  async registrarMensajeAutomatico(
    clienteId: number,
    empresaId: number,
    mensaje: string,
    consultaId: number,
    workflowId?: string,
    metadata?: Record<string, any>,
  ): Promise<NotificacionWhatsAppResponse> {
    return await this.createWhatsAppNotificacion({
      clienteId,
      empresaId,
      mensaje,
      consultaId,
      tipo: 'automatica',
      metadata: {
        origen: 'n8n_workflow',
        workflow_id: workflowId,
        automatico: true,
        ...metadata,
      },
    });
  }

  /**
   * Obtener métricas unificadas de WhatsApp + Notificaciones
   */
  async getMetricasUnificadas(empresaId: number): Promise<any> {
    const [notificacionesWA, consultasTotal, mensajesTotal] = await Promise.all(
      [
        // Notificaciones de WhatsApp del sistema unificado
        this.prisma.notificacion.count({
          where: {
            id_empresa: empresaId,
            tipo_notificacion: 'whatsapp',
          },
        }),

        // Consultas directas de WhatsApp (legacy)
        this.prisma.consultaWhatsapp.count({
          where: { id_empresa: empresaId },
        }),

        // Mensajes directos de WhatsApp (legacy)
        this.prisma.mensajeWhatsapp.count({
          where: {
            consulta: {
              id_empresa: empresaId,
            },
          },
        }),
      ],
    );

    return {
      notificaciones_whatsapp: notificacionesWA,
      consultas_whatsapp: consultasTotal,
      mensajes_whatsapp: mensajesTotal,
      integracion_activa: notificacionesWA > 0,
      sistema_unificado: true,
    };
  }

  /**
   * Migrar consultas existentes a sistema de notificaciones
   */
  async migrarConsultasExistentes(
    empresaId: number,
    limite: number = 100,
  ): Promise<{ migradas: number; errores: number }> {
    this.logger.log(
      `Iniciando migración de consultas WhatsApp a notificaciones para empresa ${empresaId}`,
    );

    let migradas = 0;
    let errores = 0;

    try {
      // Obtener consultas sin notificación asociada
      const consultas = await this.prisma.consultaWhatsapp.findMany({
        where: {
          id_empresa: empresaId,
          // Agregar condición para evitar duplicados si ya existe relación
        },
        include: {
          cliente: true,
          mensajes: {
            orderBy: { fecha_mensaje: 'asc' },
            take: 1,
          },
        },
        take: limite,
      });

      for (const consulta of consultas) {
        try {
          const primerMensaje = consulta.mensajes[0];
          if (primerMensaje && consulta.cliente) {
            await this.registrarMensajeEntrante(
              consulta.cliente.id_cliente,
              empresaId,
              primerMensaje.mensaje,
              consulta.id_consulta,
              {
                migrado: true,
                fecha_original: consulta.fecha_consulta,
              },
            );
            migradas++;
          }
        } catch (error) {
          this.logger.warn(
            `Error migrando consulta ${consulta.id_consulta}: ${error.message}`,
          );
          errores++;
        }
      }

      this.logger.log(
        `Migración completada: ${migradas} consultas migradas, ${errores} errores`,
      );

      return { migradas, errores };
    } catch (error) {
      this.logger.error(`Error en migración: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generar título basado en tipo de mensaje
   */
  private generateTituloByTipo(
    tipo: 'entrada' | 'salida' | 'automatica',
  ): string {
    switch (tipo) {
      case 'entrada':
        return 'Mensaje recibido via WhatsApp';
      case 'salida':
        return 'Respuesta enviada via WhatsApp';
      case 'automatica':
        return 'Respuesta automática via WhatsApp';
      default:
        return 'Comunicación via WhatsApp';
    }
  }

  /**
   * Crear auditoría automática para WhatsApp
   */
  private async createAuditoriaWhatsApp(
    data: WhatsAppNotificacionData,
    notificacion: any,
  ): Promise<any> {
    try {
      return await this.prisma.auditoria.create({
        data: {
          accion: TipoAccion.CREAR,
          recurso: TipoRecurso.WHATSAPP,
          recurso_id: notificacion.id_notificacion.toString(),
          descripcion: `${this.generateTituloByTipo(data.tipo)} - Cliente ID: ${data.clienteId}`,
          severidad: 'info',
          datos_nuevos: {
            tipo_mensaje: data.tipo,
            consulta_id: data.consultaId,
            mensaje_id: data.mensajeId,
            notificacion_id: notificacion.id_notificacion,
            metadata: data.metadata,
          },
          metadatos: {
            modulo: 'whatsapp_notifications',
            bridge_version: '1.0.0',
            integracion_hibrida: true,
          },
          empresa_id: data.empresaId,
          // usuario_id se asignará automáticamente por el sistema si está disponible
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo crear auditoría para notificación WhatsApp: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Limpiar notificaciones WhatsApp antigas (mantenimiento)
   */
  async limpiarNotificacionesAntiguas(
    empresaId: number,
    diasAntiguedad: number = 90,
  ): Promise<{ eliminadas: number }> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const resultado = await this.prisma.notificacion.deleteMany({
      where: {
        id_empresa: empresaId,
        tipo_notificacion: 'whatsapp',
        fecha_notificacion: {
          lt: fechaLimite,
        },
        estado: {
          in: ['leida', 'enviada'],
        },
      },
    });

    this.logger.log(
      `Limpieza completada: ${resultado.count} notificaciones WhatsApp eliminadas`,
    );

    return { eliminadas: resultado.count };
  }
}
