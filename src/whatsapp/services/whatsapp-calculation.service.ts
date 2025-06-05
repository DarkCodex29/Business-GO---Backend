import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

/**
 * Servicio especializado para cálculos y métricas de WhatsApp
 * Principio: Single Responsibility - Solo maneja cálculos y métricas
 * Contexto: Métricas específicas para el mercado peruano
 */
@Injectable()
export class WhatsappCalculationService {
  private readonly logger = new Logger(WhatsappCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula métricas diarias de WhatsApp para una empresa
   * Incluye métricas específicas para el contexto peruano
   */
  async calculateMetricasDiarias(empresaId: number, fecha: Date) {
    this.logger.log(
      `Calculando métricas diarias WhatsApp para empresa ${empresaId} - ${fecha.toISOString()}`,
    );

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    // Calcular consultas totales del día
    const consultasTotales = await this.calculateConsultasTotales(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular consultas por tipo
    const consultasPorTipo = await this.calculateConsultasPorTipo(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular consultas por estado
    const consultasPorEstado = await this.calculateConsultasPorEstado(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular tiempo promedio de respuesta
    const tiempoPromedioRespuesta = await this.calculateTiempoPromedioRespuesta(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular mensajes enviados y recibidos
    const mensajes = await this.calculateMensajes(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular satisfacción promedio
    const satisfaccionPromedio = await this.calculateSatisfaccionPromedio(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular conversiones (consultas que generaron cotizaciones)
    const conversiones = await this.calculateConversiones(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Calcular horarios de mayor actividad
    const horariosActividad = await this.calculateHorariosActividad(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    const metricas = {
      fecha: fecha.toISOString().split('T')[0],
      consultas_totales: consultasTotales,
      consultas_por_tipo: consultasPorTipo,
      consultas_por_estado: consultasPorEstado,
      tiempo_promedio_respuesta_minutos: tiempoPromedioRespuesta,
      mensajes_enviados: mensajes.enviados,
      mensajes_recibidos: mensajes.recibidos,
      satisfaccion_promedio: satisfaccionPromedio,
      tasa_conversion_porcentaje: conversiones.tasaConversion,
      consultas_convertidas: conversiones.consultasConvertidas,
      horarios_mayor_actividad: horariosActividad,
    };

    this.logger.log('Métricas diarias calculadas exitosamente');
    return metricas;
  }

  /**
   * Calcula resumen de métricas para un rango de fechas
   */
  async calculateResumenMetricas(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    this.logger.log(
      `Calculando resumen de métricas WhatsApp para empresa ${empresaId} - ${fechaInicio.toISOString()} a ${fechaFin.toISOString()}`,
    );

    // Ajustar fechas para incluir todo el día
    const fechaInicioAjustada = new Date(fechaInicio);
    fechaInicioAjustada.setHours(0, 0, 0, 0);

    const fechaFinAjustada = new Date(fechaFin);
    fechaFinAjustada.setHours(23, 59, 59, 999);

    // Calcular totales del período
    const consultasTotales = await this.calculateConsultasTotales(
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );
    const mensajesTotales = await this.calculateMensajes(
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );
    const satisfaccionPromedio = await this.calculateSatisfaccionPromedio(
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );
    const conversiones = await this.calculateConversiones(
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );

    // Calcular promedios diarios
    const diasPeriodo = Math.ceil(
      (fechaFinAjustada.getTime() - fechaInicioAjustada.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const consultasPromedioDiario = Math.round(consultasTotales / diasPeriodo);
    const mensajesPromedioDiario = Math.round(
      (mensajesTotales.enviados + mensajesTotales.recibidos) / diasPeriodo,
    );

    // Calcular tendencias
    const tendencias = await this.calculateTendencias(
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );

    // Calcular distribución por días de la semana
    const distribucionSemanal = await this.calculateDistribucionSemanal(
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );

    const resumen = {
      periodo: {
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        dias_periodo: diasPeriodo,
      },
      totales: {
        consultas_totales: consultasTotales,
        mensajes_enviados: mensajesTotales.enviados,
        mensajes_recibidos: mensajesTotales.recibidos,
        consultas_convertidas: conversiones.consultasConvertidas,
      },
      promedios: {
        consultas_por_dia: consultasPromedioDiario,
        mensajes_por_dia: mensajesPromedioDiario,
        satisfaccion_promedio: satisfaccionPromedio,
        tasa_conversion_porcentaje: conversiones.tasaConversion,
      },
      tendencias,
      distribucion_semanal: distribucionSemanal,
    };

    this.logger.log('Resumen de métricas calculado exitosamente');
    return resumen;
  }

  /**
   * Calcula tiempo de respuesta para una consulta específica
   */
  async calculateTiempoRespuestaConsulta(
    consultaId: number,
  ): Promise<number | null> {
    this.logger.log(
      `Calculando tiempo de respuesta para consulta ${consultaId}`,
    );

    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: consultaId },
      select: {
        fecha_consulta: true,
        fecha_respuesta: true,
        estado_consulta: true,
      },
    });

    if (!consulta || !consulta.fecha_respuesta) {
      return null;
    }

    const tiempoRespuestaMs =
      consulta.fecha_respuesta.getTime() - consulta.fecha_consulta.getTime();
    const tiempoRespuestaMinutos = Math.round(tiempoRespuestaMs / (1000 * 60));

    this.logger.log(
      `Tiempo de respuesta calculado: ${tiempoRespuestaMinutos} minutos`,
    );
    return tiempoRespuestaMinutos;
  }

  /**
   * Calcula métricas de rendimiento del agente/usuario
   */
  async calculateMetricasAgente(
    usuarioId: number,
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    this.logger.log(
      `Calculando métricas de agente ${usuarioId} para empresa ${empresaId}`,
    );

    const fechaInicioAjustada = new Date(fechaInicio);
    fechaInicioAjustada.setHours(0, 0, 0, 0);

    const fechaFinAjustada = new Date(fechaFin);
    fechaFinAjustada.setHours(23, 59, 59, 999);

    // Consultas atendidas por el agente
    const consultasAtendidas = await this.prisma.consultaWhatsapp.count({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicioAjustada,
          lte: fechaFinAjustada,
        },
        mensajes: {
          some: {
            es_entrante: false,
          },
        },
      },
    });

    // Mensajes enviados por el agente
    const mensajesEnviados = await this.prisma.mensajeWhatsapp.count({
      where: {
        es_entrante: false,
        fecha_mensaje: {
          gte: fechaInicioAjustada,
          lte: fechaFinAjustada,
        },
        consulta: {
          id_empresa: empresaId,
        },
      },
    });

    // Tiempo promedio de respuesta del agente
    const tiempoPromedioAgente =
      await this.calculateTiempoPromedioRespuestaAgente(
        usuarioId,
        empresaId,
        fechaInicioAjustada,
        fechaFinAjustada,
      );

    // Satisfacción promedio de consultas atendidas
    const satisfaccionAgente = await this.calculateSatisfaccionPromedioAgente(
      usuarioId,
      empresaId,
      fechaInicioAjustada,
      fechaFinAjustada,
    );

    const metricas = {
      usuario_id: usuarioId,
      consultas_atendidas: consultasAtendidas,
      mensajes_enviados: mensajesEnviados,
      tiempo_promedio_respuesta_minutos: tiempoPromedioAgente,
      satisfaccion_promedio: satisfaccionAgente,
      productividad_mensajes_por_consulta:
        consultasAtendidas > 0
          ? Math.round(mensajesEnviados / consultasAtendidas)
          : 0,
    };

    this.logger.log('Métricas de agente calculadas exitosamente');
    return metricas;
  }

  /**
   * Calcula consultas totales en un período
   */
  private async calculateConsultasTotales(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    return await this.prisma.consultaWhatsapp.count({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
    });
  }

  /**
   * Calcula distribución de consultas por tipo
   */
  private async calculateConsultasPorTipo(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const consultasPorTipo = await this.prisma.consultaWhatsapp.groupBy({
      by: ['tipo_consulta'],
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      _count: {
        id_consulta: true,
      },
    });

    return consultasPorTipo.reduce(
      (acc, item) => {
        acc[item.tipo_consulta] = item._count.id_consulta;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Calcula distribución de consultas por estado
   */
  private async calculateConsultasPorEstado(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const consultasPorEstado = await this.prisma.consultaWhatsapp.groupBy({
      by: ['estado_consulta'],
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      _count: {
        id_consulta: true,
      },
    });

    return consultasPorEstado.reduce(
      (acc, item) => {
        acc[item.estado_consulta] = item._count.id_consulta;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Calcula tiempo promedio de respuesta
   */
  async calculateTiempoPromedioRespuesta(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    const consultasRespondidas = await this.prisma.consultaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        fecha_respuesta: {
          not: null,
        },
      },
      select: {
        fecha_consulta: true,
        fecha_respuesta: true,
      },
    });

    if (consultasRespondidas.length === 0) return 0;

    const tiemposTotalMinutos = consultasRespondidas.reduce(
      (total, consulta) => {
        const tiempoMs =
          consulta.fecha_respuesta!.getTime() -
          consulta.fecha_consulta.getTime();
        return total + tiempoMs / (1000 * 60);
      },
      0,
    );

    return Math.round(tiemposTotalMinutos / consultasRespondidas.length);
  }

  /**
   * Calcula mensajes enviados y recibidos
   */
  private async calculateMensajes(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const [mensajesEnviados, mensajesRecibidos] = await Promise.all([
      this.prisma.mensajeWhatsapp.count({
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
      }),
      this.prisma.mensajeWhatsapp.count({
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
      }),
    ]);

    return {
      enviados: mensajesEnviados,
      recibidos: mensajesRecibidos,
    };
  }

  /**
   * Calcula satisfacción promedio
   */
  private async calculateSatisfaccionPromedio(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    const resultado = await this.prisma.consultaWhatsapp.aggregate({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        satisfaccion: {
          not: null,
        },
      },
      _avg: {
        satisfaccion: true,
      },
    });

    return resultado._avg.satisfaccion
      ? Math.round(resultado._avg.satisfaccion * 100) / 100
      : 0;
  }

  /**
   * Calcula conversiones (consultas que generaron cotizaciones)
   */
  private async calculateConversiones(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const [consultasTotales, consultasConvertidas] = await Promise.all([
      this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      }),
      this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaInicio,
            lte: fechaFin,
          },
          id_cotizacion: {
            not: null,
          },
        },
      }),
    ]);

    const tasaConversion =
      consultasTotales > 0
        ? Math.round((consultasConvertidas / consultasTotales) * 100 * 100) /
          100
        : 0;

    return {
      consultasConvertidas,
      tasaConversion,
    };
  }

  /**
   * Calcula horarios de mayor actividad
   */
  private async calculateHorariosActividad(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const consultas = await this.prisma.consultaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      select: {
        fecha_consulta: true,
      },
    });

    const actividadPorHora = Array(24).fill(0);

    consultas.forEach((consulta) => {
      const hora = consulta.fecha_consulta.getHours();
      actividadPorHora[hora]++;
    });

    // Encontrar las 3 horas con mayor actividad
    const horariosConActividad = actividadPorHora
      .map((cantidad, hora) => ({ hora, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3)
      .filter((item) => item.cantidad > 0);

    return horariosConActividad;
  }

  /**
   * Calcula tendencias comparando con período anterior
   */
  private async calculateTendencias(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const diasPeriodo = Math.ceil(
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24),
    );

    const fechaInicioAnterior = new Date(fechaInicio);
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasPeriodo);

    const fechaFinAnterior = new Date(fechaInicio);
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1);

    const [consultasActuales, consultasAnteriores] = await Promise.all([
      this.calculateConsultasTotales(empresaId, fechaInicio, fechaFin),
      this.calculateConsultasTotales(
        empresaId,
        fechaInicioAnterior,
        fechaFinAnterior,
      ),
    ]);

    const tendenciaConsultas =
      consultasAnteriores > 0
        ? Math.round(
            ((consultasActuales - consultasAnteriores) / consultasAnteriores) *
              100 *
              100,
          ) / 100
        : 0;

    return {
      consultas_variacion_porcentaje: tendenciaConsultas,
      consultas_periodo_actual: consultasActuales,
      consultas_periodo_anterior: consultasAnteriores,
    };
  }

  /**
   * Calcula distribución por días de la semana
   */
  private async calculateDistribucionSemanal(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const consultas = await this.prisma.consultaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      select: {
        fecha_consulta: true,
      },
    });

    const diasSemana = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const distribucion = Array(7).fill(0);

    consultas.forEach((consulta) => {
      const diaSemana = consulta.fecha_consulta.getDay();
      distribucion[diaSemana]++;
    });

    return diasSemana.map((dia, index) => ({
      dia,
      cantidad: distribucion[index],
    }));
  }

  /**
   * Calcula tiempo promedio de respuesta de un agente específico
   */
  private async calculateTiempoPromedioRespuestaAgente(
    usuarioId: number,
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    const consultas = await this.prisma.consultaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        mensajes: {
          some: {
            es_entrante: false,
          },
        },
      },
      select: {
        fecha_consulta: true,
        mensajes: {
          where: {
            es_entrante: false,
          },
          orderBy: {
            fecha_mensaje: 'asc',
          },
          take: 1,
          select: {
            fecha_mensaje: true,
          },
        },
      },
    });

    if (consultas.length === 0) return 0;

    const tiemposTotalMinutos = consultas.reduce((total, consulta) => {
      if (consulta.mensajes.length > 0) {
        const tiempoMs =
          consulta.mensajes[0].fecha_mensaje.getTime() -
          consulta.fecha_consulta.getTime();
        return total + tiempoMs / (1000 * 60);
      }
      return total;
    }, 0);

    return Math.round(tiemposTotalMinutos / consultas.length);
  }

  /**
   * Calcula satisfacción promedio de consultas atendidas por un agente
   */
  private async calculateSatisfaccionPromedioAgente(
    usuarioId: number,
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    const resultado = await this.prisma.consultaWhatsapp.aggregate({
      where: {
        id_empresa: empresaId,
        fecha_consulta: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        satisfaccion: {
          not: null,
        },
        mensajes: {
          some: {
            es_entrante: false,
          },
        },
      },
      _avg: {
        satisfaccion: true,
      },
    });

    return resultado._avg?.satisfaccion
      ? Math.round(resultado._avg.satisfaccion * 100) / 100
      : 0;
  }
}
