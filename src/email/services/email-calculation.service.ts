import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MetricasEmail,
  EmailFormatted,
  PlantillaFormatted,
  EstadoEmail,
  TipoEmail,
  PrioridadEmail,
} from './base-email.service';

// Interfaces específicas para cálculos
export interface EstadisticasEmail {
  total_emails: number;
  emails_hoy: number;
  emails_esta_semana: number;
  emails_este_mes: number;
  tasa_entrega_promedio: number;
  tasa_apertura_promedio: number;
  tasa_clics_promedio: number;
  tiempo_promedio_apertura: number; // en minutos
  email_mas_exitoso: {
    id: string;
    subject: string;
    tasa_apertura: number;
    tasa_clics: number;
  } | null;
  plantilla_mas_usada: {
    id: number;
    nombre: string;
    usos: number;
  } | null;
  distribucion_por_hora: {
    hora: number;
    cantidad: number;
  }[];
  distribucion_por_dia_semana: {
    dia: string;
    cantidad: number;
  }[];
}

export interface TendenciaEmail {
  periodo: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  datos: {
    fecha: string;
    enviados: number;
    entregados: number;
    abiertos: number;
    clics: number;
    rebotados: number;
    tasa_entrega: number;
    tasa_apertura: number;
    tasa_clics: number;
  }[];
  resumen: {
    total_enviados: number;
    total_entregados: number;
    total_abiertos: number;
    total_clics: number;
    crecimiento_enviados: number; // porcentaje vs período anterior
    crecimiento_entregados: number;
    crecimiento_abiertos: number;
    crecimiento_clics: number;
  };
}

export interface AnalisisRendimiento {
  mejores_horarios: {
    hora: number;
    tasa_apertura: number;
    tasa_clics: number;
    cantidad_enviados: number;
  }[];
  mejores_dias: {
    dia_semana: number;
    nombre_dia: string;
    tasa_apertura: number;
    tasa_clics: number;
    cantidad_enviados: number;
  }[];
  tipos_mas_efectivos: {
    tipo: TipoEmail;
    tasa_apertura: number;
    tasa_clics: number;
    cantidad_enviados: number;
  }[];
  asuntos_mas_efectivos: {
    patron: string;
    tasa_apertura: number;
    tasa_clics: number;
    ejemplos: string[];
  }[];
  recomendaciones: string[];
}

export interface ReporteDetallado {
  periodo: {
    inicio: Date;
    fin: Date;
    dias: number;
  };
  metricas_generales: {
    total_enviados: number;
    total_entregados: number;
    total_abiertos: number;
    total_clics: number;
    total_rebotados: number;
    total_spam: number;
    tasa_entrega: number;
    tasa_apertura: number;
    tasa_clics: number;
    tasa_rebote: number;
  };
  comparacion_periodo_anterior: {
    enviados_cambio: number;
    entregados_cambio: number;
    abiertos_cambio: number;
    clics_cambio: number;
    tasa_entrega_cambio: number;
    tasa_apertura_cambio: number;
    tasa_clics_cambio: number;
  };
  top_plantillas: {
    plantilla: PlantillaFormatted;
    usos: number;
    tasa_apertura: number;
    tasa_clics: number;
  }[];
  problemas_detectados: {
    tipo: string;
    descripcion: string;
    severidad: 'baja' | 'media' | 'alta';
    recomendacion: string;
  }[];
}

@Injectable()
export class EmailCalculationService {
  private readonly logger = new Logger(EmailCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcular métricas generales de emails
   */
  async calculateMetricasGenerales(emails: any[]): Promise<MetricasEmail> {
    const totalEnviados = emails.length;
    const totalEntregados = emails.filter(
      (e) =>
        e.estado === 'entregado' ||
        e.estado === 'abierto' ||
        e.estado === 'clic',
    ).length;
    const totalAbiertos = emails.filter(
      (e) => e.estado === 'abierto' || e.estado === 'clic',
    ).length;
    const totalClics = emails.filter((e) => e.estado === 'clic').length;

    const tasaEntrega =
      totalEnviados > 0 ? (totalEntregados / totalEnviados) * 100 : 0;
    const tasaApertura =
      totalEntregados > 0 ? (totalAbiertos / totalEntregados) * 100 : 0;
    const tasaClics =
      totalAbiertos > 0 ? (totalClics / totalAbiertos) * 100 : 0;

    return {
      total_enviados: totalEnviados,
      total_entregados: totalEntregados,
      total_abiertos: totalAbiertos,
      total_clics: totalClics,
      tasa_entrega: tasaEntrega,
      tasa_apertura: tasaApertura,
      tasa_clics: tasaClics,
      emails_por_tipo: this.calculateEmailsPorTipo(emails),
      emails_por_estado: this.calculateEmailsPorEstado(emails),
      tendencia_diaria: this.calculateTendenciaDiaria(emails, 7),
      plantillas_mas_usadas: this.calculatePlantillasMasUsadas(emails, 5),
    };
  }

  /**
   * Calcular estadísticas detalladas de emails
   */
  async calculateEstadisticasEmail(emails: any[]): Promise<EstadisticasEmail> {
    const ahora = new Date();
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const inicioSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const emailsHoy = emails.filter(
      (e) => new Date(e.createdAt) >= inicioHoy,
    ).length;
    const emailsSemana = emails.filter(
      (e) => new Date(e.createdAt) >= inicioSemana,
    ).length;
    const emailsMes = emails.filter(
      (e) => new Date(e.createdAt) >= inicioMes,
    ).length;

    const tasaEntrega = this.calculateTasaEntrega(emails);

    return {
      total_emails: emails.length,
      emails_hoy: emailsHoy,
      emails_esta_semana: emailsSemana,
      emails_este_mes: emailsMes,
      tasa_entrega_promedio: tasaEntrega,
      tasa_apertura_promedio: 0, // Se calculará con datos reales
      tasa_clics_promedio: 0, // Se calculará con datos reales
      tiempo_promedio_apertura: 0, // Se calculará con datos reales
      email_mas_exitoso: null, // Se calculará con datos reales
      plantilla_mas_usada: null, // Se calculará con datos reales
      distribucion_por_hora: [], // Se calculará con datos reales
      distribucion_por_dia_semana: [], // Se calculará con datos reales
    };
  }

  /**
   * Calcular tendencia de emails en un período
   */
  async calculateTendenciaEmail(
    emails: any[],
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<TendenciaEmail> {
    const emailsEnPeriodo = emails.filter((e) => {
      const fecha = new Date(e.createdAt);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });

    const datos = this.calculateTendenciaDiaria(emailsEnPeriodo, 30);

    const totalEnviados = emailsEnPeriodo.length;
    const totalEntregados = emailsEnPeriodo.filter(
      (e) =>
        e.estado === 'entregado' ||
        e.estado === 'abierto' ||
        e.estado === 'clic',
    ).length;
    const totalAbiertos = emailsEnPeriodo.filter(
      (e) => e.estado === 'abierto' || e.estado === 'clic',
    ).length;
    const totalClics = emailsEnPeriodo.filter(
      (e) => e.estado === 'clic',
    ).length;

    return {
      periodo: this.getPeriodoDescription(30),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      datos: datos,
      resumen: {
        total_enviados: totalEnviados,
        total_entregados: totalEntregados,
        total_abiertos: totalAbiertos,
        total_clics: totalClics,
        crecimiento_enviados: 0, // Se calculará comparando con período anterior
        crecimiento_entregados: 0,
        crecimiento_abiertos: 0,
        crecimiento_clics: 0,
      },
    };
  }

  /**
   * Calcular análisis de rendimiento
   */
  async calculateAnalisisRendimiento(
    emails: any[],
  ): Promise<AnalisisRendimiento> {
    return {
      mejores_horarios: [],
      mejores_dias: [],
      tipos_mas_efectivos: [],
      asuntos_mas_efectivos: [],
      recomendaciones: this.generateRecomendaciones([], [], [], []),
    };
  }

  /**
   * Generar reporte detallado
   */
  async generateReporteDetallado(
    emails: any[],
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<ReporteDetallado> {
    const emailsEnPeriodo = emails.filter((e) => {
      const fecha = new Date(e.createdAt);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });

    const totalEnviados = emailsEnPeriodo.length;
    const totalEntregados = emailsEnPeriodo.filter(
      (e) =>
        e.estado === 'entregado' ||
        e.estado === 'abierto' ||
        e.estado === 'clic',
    ).length;
    const totalAbiertos = emailsEnPeriodo.filter(
      (e) => e.estado === 'abierto' || e.estado === 'clic',
    ).length;
    const totalClics = emailsEnPeriodo.filter(
      (e) => e.estado === 'clic',
    ).length;
    const totalRebotados = emailsEnPeriodo.filter(
      (e) => e.estado === 'rebotado',
    ).length;
    const totalSpam = emailsEnPeriodo.filter((e) => e.estado === 'spam').length;

    const tasaEntrega =
      totalEnviados > 0 ? (totalEntregados / totalEnviados) * 100 : 0;
    const tasaApertura =
      totalEntregados > 0 ? (totalAbiertos / totalEntregados) * 100 : 0;
    const tasaClics =
      totalAbiertos > 0 ? (totalClics / totalAbiertos) * 100 : 0;
    const tasaRebote =
      totalEnviados > 0 ? (totalRebotados / totalEnviados) * 100 : 0;

    const dias = Math.ceil(
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin,
        dias: dias,
      },
      metricas_generales: {
        total_enviados: totalEnviados,
        total_entregados: totalEntregados,
        total_abiertos: totalAbiertos,
        total_clics: totalClics,
        total_rebotados: totalRebotados,
        total_spam: totalSpam,
        tasa_entrega: tasaEntrega,
        tasa_apertura: tasaApertura,
        tasa_clics: tasaClics,
        tasa_rebote: tasaRebote,
      },
      comparacion_periodo_anterior: {
        enviados_cambio: 0,
        entregados_cambio: 0,
        abiertos_cambio: 0,
        clics_cambio: 0,
        tasa_entrega_cambio: 0,
        tasa_apertura_cambio: 0,
        tasa_clics_cambio: 0,
      },
      top_plantillas: [],
      problemas_detectados: [],
    };
  }

  // Métodos auxiliares para cálculos con arrays

  /**
   * Calcular distribución de emails por tipo
   */
  private calculateEmailsPorTipo(emails: any[]): any[] {
    const tipoCount = emails.reduce((acc, email) => {
      const tipo = email.tipo || 'personalizado';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(tipoCount).map(([tipo, cantidad]) => ({
      tipo: tipo as TipoEmail,
      cantidad: cantidad as number,
      tasa_entrega: this.calculateTasaEntrega(
        emails.filter((e) => e.tipo === tipo),
      ),
    }));
  }

  /**
   * Calcular distribución de emails por estado
   */
  private calculateEmailsPorEstado(emails: any[]): any[] {
    const estadoCount = emails.reduce((acc, email) => {
      const estado = email.estado || 'pendiente';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    const total = emails.length;

    return Object.entries(estadoCount).map(([estado, cantidad]) => ({
      estado: estado as EstadoEmail,
      cantidad: cantidad as number,
      porcentaje: total > 0 ? ((cantidad as number) / total) * 100 : 0,
    }));
  }

  /**
   * Calcular tendencia diaria de emails
   */
  private calculateTendenciaDiaria(emails: any[], dias: number): any[] {
    const ahora = new Date();
    const resultado: any[] = [];

    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
      const fechaStr = fecha.toISOString().split('T')[0];

      const emailsDelDia = emails.filter((e) => {
        const emailFecha = new Date(e.createdAt).toISOString().split('T')[0];
        return emailFecha === fechaStr;
      });

      const enviados = emailsDelDia.length;
      const entregados = emailsDelDia.filter(
        (e) =>
          e.estado === 'entregado' ||
          e.estado === 'abierto' ||
          e.estado === 'clic',
      ).length;
      const abiertos = emailsDelDia.filter(
        (e) => e.estado === 'abierto' || e.estado === 'clic',
      ).length;

      resultado.push({
        fecha: fechaStr,
        enviados,
        entregados,
        abiertos,
      });
    }

    return resultado;
  }

  /**
   * Calcular plantillas más usadas
   */
  private calculatePlantillasMasUsadas(emails: any[], limit: number): any[] {
    const plantillaCount = emails.reduce((acc, email) => {
      if (email.plantilla_id) {
        acc[email.plantilla_id] = (acc[email.plantilla_id] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(plantillaCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
      .map(([plantillaId, usos]) => ({
        plantilla: { id: plantillaId, nombre: `Plantilla ${plantillaId}` }, // Placeholder
        usos: usos as number,
      }));
  }

  /**
   * Calcular tasa de entrega
   */
  private calculateTasaEntrega(emails: any[]): number {
    if (emails.length === 0) return 0;

    const entregados = emails.filter(
      (e) =>
        e.estado === 'entregado' ||
        e.estado === 'abierto' ||
        e.estado === 'clic',
    ).length;

    return (entregados / emails.length) * 100;
  }

  // Métodos privados existentes (mantenidos para compatibilidad pero no usados)
  private async getTotalEmailsEnviados(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getTotalEmailsEntregados(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getTotalEmailsAbiertos(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getTotalEmailsClics(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getEmailsPorTipo(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getEmailsPorEstado(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getTendenciaDiaria(
    empresaId: number,
    dias: number,
  ): Promise<any[]> {
    return []; // Placeholder
  }

  private async getPlantillasMasUsadas(
    empresaId: number,
    limit: number,
  ): Promise<any[]> {
    return []; // Placeholder
  }

  private async getEmailsEnPeriodo(
    empresaId: number,
    inicio: Date,
    fin: Date,
  ): Promise<number> {
    return 0; // Placeholder
  }

  private async getTasaEntregaPromedio(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getTasaAperturaPromedio(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getTasaClicsPromedio(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getTiempoPromedioApertura(empresaId: number): Promise<number> {
    return 0; // Placeholder
  }

  private async getEmailMasExitoso(empresaId: number): Promise<any> {
    return null; // Placeholder
  }

  private async getPlantillaMasUsada(empresaId: number): Promise<any> {
    return null; // Placeholder
  }

  private async getDistribucionPorHora(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getDistribucionPorDiaSemana(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getDatosDiarios(
    empresaId: number,
    inicio: Date,
    fin: Date,
  ): Promise<any[]> {
    return []; // Placeholder
  }

  private async getMejoresHorarios(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getMejoresDias(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getTiposMasEfectivos(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getAsuntosMasEfectivos(empresaId: number): Promise<any[]> {
    return []; // Placeholder
  }

  private async getMetricasPeriodo(
    empresaId: number,
    inicio: Date,
    fin: Date,
  ): Promise<any> {
    return {}; // Placeholder
  }

  private async getTopPlantillasPeriodo(
    empresaId: number,
    inicio: Date,
    fin: Date,
  ): Promise<any[]> {
    return []; // Placeholder
  }

  private async detectProblemas(
    empresaId: number,
    inicio: Date,
    fin: Date,
  ): Promise<any[]> {
    return []; // Placeholder
  }

  private generateRecomendaciones(
    mejoresHorarios: any[],
    mejoresDias: any[],
    tiposMasEfectivos: any[],
    asuntosMasEfectivos: any[],
  ): string[] {
    const recomendaciones: string[] = [];

    if (mejoresHorarios.length > 0) {
      recomendaciones.push(
        `Envía emails entre las ${mejoresHorarios[0].hora}:00 y ${mejoresHorarios[0].hora + 2}:00 para mejor rendimiento`,
      );
    }

    if (mejoresDias.length > 0) {
      recomendaciones.push(
        `Los ${mejoresDias[0].nombre_dia}s tienen mejor tasa de apertura`,
      );
    }

    if (tiposMasEfectivos.length > 0) {
      recomendaciones.push(
        `Los emails de tipo ${tiposMasEfectivos[0].tipo} tienen mejor rendimiento`,
      );
    }

    if (recomendaciones.length === 0) {
      recomendaciones.push(
        'Continúa monitoreando las métricas para obtener recomendaciones personalizadas',
      );
    }

    return recomendaciones;
  }

  private calculateGrowthPercentage(actual: number, anterior: number): number {
    if (anterior === 0) return actual > 0 ? 100 : 0;
    return ((actual - anterior) / anterior) * 100;
  }

  private getPeriodoDescription(dias: number): string {
    if (dias <= 7) return 'Última semana';
    if (dias <= 30) return 'Último mes';
    if (dias <= 90) return 'Últimos 3 meses';
    return `Últimos ${dias} días`;
  }
}
