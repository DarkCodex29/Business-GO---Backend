import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MetricasNotificaciones {
  total_notificaciones: number;
  notificaciones_pendientes: number;
  notificaciones_enviadas: number;
  notificaciones_leidas: number;
  notificaciones_fallidas: number;
  tasa_apertura: number;
  tasa_respuesta: number;
  promedio_tiempo_lectura: number;
  distribucion_por_estado: {
    pendiente: number;
    enviada: number;
    leida: number;
    fallida: number;
  };
}

export interface EstadisticasCliente {
  id_cliente: number;
  nombre_cliente: string;
  email_cliente: string;
  total_notificaciones: number;
  notificaciones_leidas: number;
  tasa_apertura_personal: number;
  ultima_notificacion: string;
  feedback_count: number;
}

export interface TendenciaNotificaciones {
  fecha: string;
  total_enviadas: number;
  total_leidas: number;
  tasa_apertura_diaria: number;
}

export interface AnalisisFeedback {
  total_feedback: number;
  feedback_positivo: number;
  feedback_negativo: number;
  feedback_neutro: number;
  promedio_satisfaccion: number;
  comentarios_recientes: Array<{
    comentario: string;
    fecha: string;
    cliente: string;
  }>;
}

@Injectable()
export class NotificacionesCalculationService {
  private readonly logger = new Logger(NotificacionesCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcular métricas generales de notificaciones para una empresa
   */
  async calculateMetricasGenerales(
    empresaId: number,
  ): Promise<MetricasNotificaciones> {
    try {
      // Obtener clientes de la empresa
      const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
        where: { empresa_id: empresaId },
        select: { cliente_id: true },
      });

      const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

      if (clienteIds.length === 0) {
        return this.getEmptyMetricas();
      }

      // Obtener todas las notificaciones de la empresa
      const notificaciones = await this.prisma.notificacion.findMany({
        where: {
          id_cliente: { in: clienteIds },
        },
        select: {
          estado: true,
          fecha_notificacion: true,
        },
      });

      const total = notificaciones.length;

      if (total === 0) {
        return this.getEmptyMetricas();
      }

      // Contar por estado
      const contadores = {
        pendiente: 0,
        enviada: 0,
        leida: 0,
        fallida: 0,
      };

      notificaciones.forEach((notif) => {
        if (contadores.hasOwnProperty(notif.estado)) {
          contadores[notif.estado]++;
        }
      });

      // Calcular tasas
      const tasaApertura = total > 0 ? (contadores.leida / total) * 100 : 0;

      // Calcular feedback para tasa de respuesta
      const totalFeedback = await this.prisma.feedback.count({
        where: {
          cliente: {
            empresas: {
              some: {
                empresa_id: empresaId,
              },
            },
          },
        },
      });

      const tasaRespuesta = total > 0 ? (totalFeedback / total) * 100 : 0;

      // Simular promedio de tiempo de lectura (en horas)
      const promedioTiempoLectura =
        this.calculatePromedioTiempoLectura(notificaciones);

      return {
        total_notificaciones: total,
        notificaciones_pendientes: contadores.pendiente,
        notificaciones_enviadas: contadores.enviada,
        notificaciones_leidas: contadores.leida,
        notificaciones_fallidas: contadores.fallida,
        tasa_apertura: Math.round(tasaApertura * 100) / 100,
        tasa_respuesta: Math.round(tasaRespuesta * 100) / 100,
        promedio_tiempo_lectura: promedioTiempoLectura,
        distribucion_por_estado: contadores,
      };
    } catch (error) {
      this.logger.error(
        `Error calculando métricas generales: ${error.message}`,
      );
      return this.getEmptyMetricas();
    }
  }

  /**
   * Calcular estadísticas específicas de un cliente
   */
  async calculateEstadisticasCliente(
    clienteId: number,
    empresaId: number,
  ): Promise<EstadisticasCliente> {
    try {
      // Validar que el cliente pertenece a la empresa
      const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
        where: {
          cliente_id: clienteId,
          empresa_id: empresaId,
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              email: true,
            },
          },
        },
      });

      if (!clienteEmpresa) {
        throw new Error('Cliente no encontrado en la empresa');
      }

      // Obtener notificaciones del cliente
      const notificaciones = await this.prisma.notificacion.findMany({
        where: {
          id_cliente: clienteId,
        },
        orderBy: {
          fecha_notificacion: 'desc',
        },
      });

      const totalNotificaciones = notificaciones.length;
      const notificacionesLeidas = notificaciones.filter(
        (n) => n.estado === 'leida',
      ).length;
      const tasaAperturaPersonal =
        totalNotificaciones > 0
          ? (notificacionesLeidas / totalNotificaciones) * 100
          : 0;

      // Obtener feedback del cliente
      const feedbackCount = await this.prisma.feedback.count({
        where: { id_cliente: clienteId },
      });

      const ultimaNotificacion =
        notificaciones.length > 0
          ? notificaciones[0].fecha_notificacion.toISOString()
          : '';

      return {
        id_cliente: clienteId,
        nombre_cliente: clienteEmpresa.cliente.nombre,
        email_cliente: clienteEmpresa.cliente.email,
        total_notificaciones: totalNotificaciones,
        notificaciones_leidas: notificacionesLeidas,
        tasa_apertura_personal: Math.round(tasaAperturaPersonal * 100) / 100,
        ultima_notificacion: ultimaNotificacion,
        feedback_count: feedbackCount,
      };
    } catch (error) {
      this.logger.error(
        `Error calculando estadísticas del cliente: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Calcular tendencia de notificaciones por día
   */
  async calculateTendenciaNotificaciones(
    empresaId: number,
    dias: number = 30,
  ): Promise<TendenciaNotificaciones[]> {
    try {
      const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
        where: { empresa_id: empresaId },
        select: { cliente_id: true },
      });

      const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

      if (clienteIds.length === 0) {
        return [];
      }

      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);

      const notificaciones = await this.prisma.notificacion.findMany({
        where: {
          id_cliente: { in: clienteIds },
          fecha_notificacion: {
            gte: fechaInicio,
          },
        },
        select: {
          fecha_notificacion: true,
          estado: true,
        },
      });

      // Agrupar por día
      const tendenciaPorDia = new Map<
        string,
        { enviadas: number; leidas: number }
      >();

      notificaciones.forEach((notif) => {
        const fecha = notif.fecha_notificacion.toISOString().split('T')[0];

        if (!tendenciaPorDia.has(fecha)) {
          tendenciaPorDia.set(fecha, { enviadas: 0, leidas: 0 });
        }

        const datos = tendenciaPorDia.get(fecha)!;
        datos.enviadas++;

        if (notif.estado === 'leida') {
          datos.leidas++;
        }
      });

      // Convertir a array y calcular tasas
      const tendencia: TendenciaNotificaciones[] = [];

      for (let i = 0; i < dias; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];

        const datos = tendenciaPorDia.get(fechaStr) || {
          enviadas: 0,
          leidas: 0,
        };
        const tasaApertura =
          datos.enviadas > 0 ? (datos.leidas / datos.enviadas) * 100 : 0;

        tendencia.unshift({
          fecha: fechaStr,
          total_enviadas: datos.enviadas,
          total_leidas: datos.leidas,
          tasa_apertura_diaria: Math.round(tasaApertura * 100) / 100,
        });
      }

      return tendencia;
    } catch (error) {
      this.logger.error(`Error calculando tendencia: ${error.message}`);
      return [];
    }
  }

  /**
   * Analizar feedback de notificaciones
   */
  async calculateAnalisisFeedback(
    empresaId: number,
  ): Promise<AnalisisFeedback> {
    try {
      const feedback = await this.prisma.feedback.findMany({
        where: {
          cliente: {
            empresas: {
              some: {
                empresa_id: empresaId,
              },
            },
          },
        },
        include: {
          cliente: {
            select: {
              nombre: true,
            },
          },
        },
        orderBy: {
          fecha_feedback: 'desc',
        },
      });

      const totalFeedback = feedback.length;

      if (totalFeedback === 0) {
        return {
          total_feedback: 0,
          feedback_positivo: 0,
          feedback_negativo: 0,
          feedback_neutro: 0,
          promedio_satisfaccion: 0,
          comentarios_recientes: [],
        };
      }

      // Analizar sentimiento básico
      let positivo = 0;
      let negativo = 0;
      let neutro = 0;

      feedback.forEach((fb) => {
        const comentario = fb.comentario.toLowerCase();

        if (this.esComentarioPositivo(comentario)) {
          positivo++;
        } else if (this.esComentarioNegativo(comentario)) {
          negativo++;
        } else {
          neutro++;
        }
      });

      // Calcular promedio de satisfacción (escala 1-5)
      const promedioSatisfaccion = this.calculatePromedioSatisfaccion(
        positivo,
        neutro,
        negativo,
      );

      // Obtener comentarios recientes
      const comentariosRecientes = feedback.slice(0, 5).map((fb) => ({
        comentario: fb.comentario,
        fecha: fb.fecha_feedback.toISOString(),
        cliente: fb.cliente.nombre,
      }));

      return {
        total_feedback: totalFeedback,
        feedback_positivo: positivo,
        feedback_negativo: negativo,
        feedback_neutro: neutro,
        promedio_satisfaccion: promedioSatisfaccion,
        comentarios_recientes: comentariosRecientes,
      };
    } catch (error) {
      this.logger.error(`Error analizando feedback: ${error.message}`);
      return {
        total_feedback: 0,
        feedback_positivo: 0,
        feedback_negativo: 0,
        feedback_neutro: 0,
        promedio_satisfaccion: 0,
        comentarios_recientes: [],
      };
    }
  }

  /**
   * Obtener clientes más activos en notificaciones
   */
  async getClientesMasActivos(
    empresaId: number,
    limite: number = 10,
  ): Promise<EstadisticasCliente[]> {
    try {
      const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
        where: { empresa_id: empresaId },
        select: { cliente_id: true },
      });

      const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

      if (clienteIds.length === 0) {
        return [];
      }

      // Obtener estadísticas para cada cliente
      const estadisticasPromises = clienteIds.map((clienteId) =>
        this.calculateEstadisticasCliente(clienteId, empresaId),
      );

      const estadisticas = await Promise.all(estadisticasPromises);

      // Ordenar por total de notificaciones y tasa de apertura
      return estadisticas
        .sort((a, b) => {
          if (b.total_notificaciones !== a.total_notificaciones) {
            return b.total_notificaciones - a.total_notificaciones;
          }
          return b.tasa_apertura_personal - a.tasa_apertura_personal;
        })
        .slice(0, limite);
    } catch (error) {
      this.logger.error(
        `Error obteniendo clientes más activos: ${error.message}`,
      );
      return [];
    }
  }

  // Métodos auxiliares privados

  private getEmptyMetricas(): MetricasNotificaciones {
    return {
      total_notificaciones: 0,
      notificaciones_pendientes: 0,
      notificaciones_enviadas: 0,
      notificaciones_leidas: 0,
      notificaciones_fallidas: 0,
      tasa_apertura: 0,
      tasa_respuesta: 0,
      promedio_tiempo_lectura: 0,
      distribucion_por_estado: {
        pendiente: 0,
        enviada: 0,
        leida: 0,
        fallida: 0,
      },
    };
  }

  private calculatePromedioTiempoLectura(notificaciones: any[]): number {
    // Simulación del tiempo promedio de lectura
    // En una implementación real, se calcularía basado en timestamps de lectura
    const notificacionesLeidas = notificaciones.filter(
      (n) => n.estado === 'leida',
    );

    if (notificacionesLeidas.length === 0) {
      return 0;
    }

    // Simular tiempo promedio entre 2-48 horas
    const tiempoPromedio = Math.random() * 46 + 2;
    return Math.round(tiempoPromedio * 100) / 100;
  }

  private esComentarioPositivo(comentario: string): boolean {
    const palabrasPositivas = [
      'excelente',
      'bueno',
      'genial',
      'perfecto',
      'útil',
      'gracias',
      'me gusta',
      'recomiendo',
      'satisfecho',
      'contento',
      'feliz',
      'increíble',
      'fantástico',
    ];

    return palabrasPositivas.some((palabra) => comentario.includes(palabra));
  }

  private esComentarioNegativo(comentario: string): boolean {
    const palabrasNegativas = [
      'malo',
      'terrible',
      'horrible',
      'no me gusta',
      'molesto',
      'spam',
      'innecesario',
      'inútil',
      'desagradable',
      'no quiero',
      'cancelar',
      'desuscribir',
      'fastidioso',
    ];

    return palabrasNegativas.some((palabra) => comentario.includes(palabra));
  }

  private calculatePromedioSatisfaccion(
    positivo: number,
    neutro: number,
    negativo: number,
  ): number {
    const total = positivo + neutro + negativo;

    if (total === 0) {
      return 0;
    }

    // Escala: positivo = 5, neutro = 3, negativo = 1
    const puntuacionTotal = positivo * 5 + neutro * 3 + negativo * 1;
    const promedio = puntuacionTotal / total;

    return Math.round(promedio * 100) / 100;
  }
}
