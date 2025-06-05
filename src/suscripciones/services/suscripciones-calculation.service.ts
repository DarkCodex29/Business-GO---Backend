import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PlanSuscripcion,
  EstadoSuscripcion,
  PLANES_CONFIG,
} from '../../common/enums/estados.enum';

/**
 * Servicio especializado para cálculos y métricas de suscripciones
 * Principio: Single Responsibility - Solo maneja cálculos y métricas
 * Contexto: Cálculos específicos para el mercado peruano SaaS
 */
@Injectable()
export class SuscripcionesCalculationService {
  private readonly logger = new Logger(SuscripcionesCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula métricas generales de suscripciones
   */
  async calculateMetricasGenerales() {
    this.logger.log('Calculando métricas generales de suscripciones');

    const [
      totalSuscripciones,
      suscripcionesActivas,
      suscripcionesSuspendidas,
      suscripcionesTrial,
      ingresosMensuales,
      distribucionPlanes,
    ] = await Promise.all([
      this.calculateTotalSuscripciones(),
      this.calculateSuscripcionesActivas(),
      this.calculateSuscripcionesSuspendidas(),
      this.calculateSuscripcionesTrial(),
      this.calculateIngresosMensuales(),
      this.calculateDistribucionPlanes(),
    ]);

    const tasaRetencion = await this.calculateTasaRetencion();
    const ingresoPromedioPorUsuario = await this.calculateARPU();
    const valorTiempoVidaCliente = await this.calculateLTV();

    const metricas = {
      resumen: {
        total_suscripciones: totalSuscripciones,
        suscripciones_activas: suscripcionesActivas,
        suscripciones_suspendidas: suscripcionesSuspendidas,
        suscripciones_trial: suscripcionesTrial,
        tasa_activacion_porcentaje:
          totalSuscripciones > 0
            ? Math.round(
                (suscripcionesActivas / totalSuscripciones) * 100 * 100,
              ) / 100
            : 0,
      },
      financieras: {
        ingresos_mensuales_soles: ingresosMensuales,
        ingreso_promedio_por_usuario_soles: ingresoPromedioPorUsuario,
        valor_tiempo_vida_cliente_soles: valorTiempoVidaCliente,
        tasa_retencion_porcentaje: tasaRetencion,
      },
      distribucion_planes: distribucionPlanes,
      fecha_calculo: new Date().toISOString(),
    };

    this.logger.log('Métricas generales calculadas exitosamente');
    return metricas;
  }

  /**
   * Calcula métricas de una suscripción específica
   */
  async calculateMetricasSuscripcion(suscripcionId: number) {
    this.logger.log(`Calculando métricas para suscripción ${suscripcionId}`);

    const suscripcion = await this.prisma.suscripcionEmpresa.findUnique({
      where: { id_suscripcion: suscripcionId },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
          },
        },
        pagos_suscripcion: {
          orderBy: { fecha_pago: 'desc' },
        },
      },
    });

    if (!suscripcion) {
      throw new Error(`Suscripción ${suscripcionId} no encontrada`);
    }

    // Calcular uso actual vs límites
    const usoActual = await this.calculateUsoActual(suscripcion.id_empresa);

    // Calcular historial de pagos
    const historialPagos = await this.calculateHistorialPagos(suscripcionId);

    // Calcular días restantes
    const diasRestantes = suscripcion.fecha_fin
      ? this.calculateDiasRestantes(suscripcion.fecha_fin)
      : 0;

    // Calcular valor total pagado
    const valorTotalPagado = suscripcion.pagos_suscripcion.reduce(
      (total, pago) => total + Number(pago.monto),
      0,
    );

    const metricas = {
      suscripcion: {
        id_suscripcion: suscripcion.id_suscripcion,
        plan: suscripcion.plan,
        estado: suscripcion.estado,
        dias_restantes: diasRestantes,
        precio_mensual_soles: suscripcion.precio_mensual,
        valor_total_pagado_soles: valorTotalPagado,
      },
      uso_vs_limites: {
        clientes: {
          actual: usoActual.clientes,
          limite: suscripcion.limite_clientes,
          porcentaje_uso: Math.round(
            (usoActual.clientes / suscripcion.limite_clientes) * 100,
          ),
        },
        productos: {
          actual: usoActual.productos,
          limite: suscripcion.limite_productos,
          porcentaje_uso: Math.round(
            (usoActual.productos / suscripcion.limite_productos) * 100,
          ),
        },
        usuarios: {
          actual: usoActual.usuarios,
          limite: suscripcion.limite_usuarios,
          porcentaje_uso: Math.round(
            (usoActual.usuarios / suscripcion.limite_usuarios) * 100,
          ),
        },
        mensajes_whatsapp: {
          actual: usoActual.mensajes,
          limite: suscripcion.limite_mensajes,
          porcentaje_uso: Math.round(
            (usoActual.mensajes / suscripcion.limite_mensajes) * 100,
          ),
        },
      },
      historial_pagos: historialPagos,
      empresa: suscripcion.empresa,
    };

    this.logger.log('Métricas de suscripción calculadas exitosamente');
    return metricas;
  }

  /**
   * Calcula proyección de ingresos
   */
  async calculateProyeccionIngresos(meses: number = 12) {
    this.logger.log(`Calculando proyección de ingresos para ${meses} meses`);

    const suscripcionesActivas = await this.prisma.suscripcionEmpresa.findMany({
      where: {
        activa: true,
        estado: {
          in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.TRIAL],
        },
      },
      select: {
        precio_mensual: true,
        plan: true,
        fecha_fin: true,
      },
    });

    const proyeccion: any[] = [];
    const fechaBase = new Date();

    for (let mes = 1; mes <= meses; mes++) {
      const fechaMes = new Date(fechaBase);
      fechaMes.setMonth(fechaMes.getMonth() + mes);

      // Calcular suscripciones que estarán activas ese mes
      const suscripcionesActivasEnMes = suscripcionesActivas.filter(
        (sub) => sub.fecha_fin && new Date(sub.fecha_fin) >= fechaMes,
      );

      const ingresoMes = suscripcionesActivasEnMes.reduce(
        (total, sub) => total + Number(sub.precio_mensual),
        0,
      );

      // Calcular distribución por plan
      const distribucionPlan = this.calculateDistribucionPorPlan(
        suscripcionesActivasEnMes,
      );

      proyeccion.push({
        mes: mes,
        fecha: fechaMes.toISOString().split('T')[0],
        ingreso_proyectado_soles: Math.round(ingresoMes * 100) / 100,
        suscripciones_activas: suscripcionesActivasEnMes.length,
        distribucion_por_plan: distribucionPlan,
      });
    }

    this.logger.log('Proyección de ingresos calculada exitosamente');
    return {
      proyeccion_meses: proyeccion,
      resumen: {
        ingreso_total_proyectado_soles: proyeccion.reduce(
          (total, mes) => total + mes.ingreso_proyectado_soles,
          0,
        ),
        promedio_mensual_soles:
          proyeccion.length > 0
            ? Math.round(
                (proyeccion.reduce(
                  (total, mes) => total + mes.ingreso_proyectado_soles,
                  0,
                ) /
                  proyeccion.length) *
                  100,
              ) / 100
            : 0,
      },
    };
  }

  /**
   * Calcula análisis de churn (cancelaciones)
   */
  async calculateAnalisisChurn(meses: number = 6) {
    this.logger.log(`Calculando análisis de churn para ${meses} meses`);

    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - meses);

    // Obtener suscripciones que se cancelaron en el período
    const suscripcionesCanceladas =
      await this.prisma.suscripcionEmpresa.findMany({
        where: {
          activa: false,
          fecha_actualizacion: {
            gte: fechaInicio,
          },
        },
        include: {
          empresa: {
            select: {
              nombre: true,
              ruc: true,
            },
          },
          pagos_suscripcion: true,
        },
      });

    // Calcular churn por mes
    const churnPorMes: any[] = [];
    for (let i = 0; i < meses; i++) {
      const inicioMes = new Date();
      inicioMes.setMonth(inicioMes.getMonth() - i - 1);
      inicioMes.setDate(1);

      const finMes = new Date(inicioMes);
      finMes.setMonth(finMes.getMonth() + 1);
      finMes.setDate(0);

      const cancelacionesEnMes = suscripcionesCanceladas.filter((sub) => {
        const fechaCancelacion = new Date(sub.fecha_actualizacion);
        return fechaCancelacion >= inicioMes && fechaCancelacion <= finMes;
      });

      // Calcular suscripciones activas al inicio del mes
      const suscripcionesActivasInicioMes =
        await this.prisma.suscripcionEmpresa.count({
          where: {
            fecha_creacion: {
              lte: inicioMes,
            },
            OR: [
              { activa: true },
              {
                AND: [
                  { activa: false },
                  { fecha_actualizacion: { gt: finMes } },
                ],
              },
            ],
          },
        });

      const tasaChurn =
        suscripcionesActivasInicioMes > 0
          ? (cancelacionesEnMes.length / suscripcionesActivasInicioMes) * 100
          : 0;

      churnPorMes.unshift({
        mes: inicioMes.toISOString().split('T')[0].substring(0, 7),
        cancelaciones: cancelacionesEnMes.length,
        suscripciones_activas_inicio: suscripcionesActivasInicioMes,
        tasa_churn_porcentaje: Math.round(tasaChurn * 100) / 100,
      });
    }

    // Calcular razones principales de cancelación
    const razonesChurn = await this.calculateRazonesChurn(
      suscripcionesCanceladas,
    );

    // Calcular valor perdido por churn
    const valorPerdido = suscripcionesCanceladas.reduce(
      (total, sub) => total + Number(sub.precio_mensual),
      0,
    );

    const analisis = {
      resumen: {
        total_cancelaciones_periodo: suscripcionesCanceladas.length,
        tasa_churn_promedio_porcentaje:
          churnPorMes.length > 0
            ? Math.round(
                (churnPorMes.reduce(
                  (total, mes) => total + mes.tasa_churn_porcentaje,
                  0,
                ) /
                  churnPorMes.length) *
                  100,
              ) / 100
            : 0,
        valor_perdido_mensual_soles: Math.round(valorPerdido * 100) / 100,
      },
      churn_por_mes: churnPorMes,
      razones_principales: razonesChurn,
      impacto_financiero: {
        ingreso_perdido_soles: valorPerdido,
        proyeccion_perdida_anual_soles:
          Math.round(valorPerdido * 12 * 100) / 100,
      },
    };

    this.logger.log('Análisis de churn calculado exitosamente');
    return analisis;
  }

  /**
   * Calcula costo de adquisición de cliente (CAC)
   */
  async calculateCAC(meses: number = 3) {
    this.logger.log(`Calculando CAC para ${meses} meses`);

    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - meses);

    // Obtener nuevas suscripciones en el período
    const nuevasSuscripciones = await this.prisma.suscripcionEmpresa.count({
      where: {
        fecha_creacion: {
          gte: fechaInicio,
        },
      },
    });

    // Simular costos de marketing y ventas para Perú
    // En implementación real, estos datos vendrían de un sistema de contabilidad
    const costosMarketing = this.estimateMarketingCosts(meses);
    const costosVentas = this.estimateSalesCosts(meses);
    const costosTotal = costosMarketing + costosVentas;

    const cac =
      nuevasSuscripciones > 0
        ? Math.round((costosTotal / nuevasSuscripciones) * 100) / 100
        : 0;

    const analisis = {
      periodo_meses: meses,
      nuevas_suscripciones: nuevasSuscripciones,
      costos: {
        marketing_soles: costosMarketing,
        ventas_soles: costosVentas,
        total_soles: costosTotal,
      },
      cac_soles: cac,
      benchmarks_peru: {
        cac_bajo_soles: 150,
        cac_promedio_soles: 300,
        cac_alto_soles: 500,
      },
      evaluacion: this.evaluateCAC(cac),
    };

    this.logger.log('CAC calculado exitosamente');
    return analisis;
  }

  /**
   * Calcula total de suscripciones
   */
  private async calculateTotalSuscripciones(): Promise<number> {
    return await this.prisma.suscripcionEmpresa.count();
  }

  /**
   * Calcula suscripciones activas
   */
  private async calculateSuscripcionesActivas(): Promise<number> {
    return await this.prisma.suscripcionEmpresa.count({
      where: {
        activa: true,
        estado: EstadoSuscripcion.ACTIVA,
      },
    });
  }

  /**
   * Calcula suscripciones suspendidas
   */
  private async calculateSuscripcionesSuspendidas(): Promise<number> {
    return await this.prisma.suscripcionEmpresa.count({
      where: {
        estado: EstadoSuscripcion.SUSPENDIDA,
      },
    });
  }

  /**
   * Calcula suscripciones en trial
   */
  private async calculateSuscripcionesTrial(): Promise<number> {
    return await this.prisma.suscripcionEmpresa.count({
      where: {
        estado: EstadoSuscripcion.TRIAL,
        activa: true,
      },
    });
  }

  /**
   * Calcula ingresos mensuales
   */
  private async calculateIngresosMensuales(): Promise<number> {
    const resultado = await this.prisma.suscripcionEmpresa.aggregate({
      where: {
        activa: true,
        estado: {
          in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.TRIAL],
        },
      },
      _sum: {
        precio_mensual: true,
      },
    });

    return Number(resultado._sum.precio_mensual) || 0;
  }

  /**
   * Calcula distribución de planes
   */
  private async calculateDistribucionPlanes() {
    const distribucion = await this.prisma.suscripcionEmpresa.groupBy({
      by: ['plan'],
      where: {
        activa: true,
      },
      _count: {
        id_suscripcion: true,
      },
      _sum: {
        precio_mensual: true,
      },
    });

    return distribucion.map((item) => ({
      plan: item.plan,
      cantidad: item._count.id_suscripcion,
      ingreso_mensual_soles: item._sum.precio_mensual || 0,
    }));
  }

  /**
   * Calcula tasa de retención
   */
  private async calculateTasaRetencion(): Promise<number> {
    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);

    const [
      suscripcionesHace3Meses,
      suscripcionesActualesQueExistianHace3Meses,
    ] = await Promise.all([
      this.prisma.suscripcionEmpresa.count({
        where: {
          fecha_creacion: {
            lte: hace3Meses,
          },
          activa: true,
        },
      }),
      this.prisma.suscripcionEmpresa.count({
        where: {
          fecha_creacion: {
            lte: hace3Meses,
          },
          activa: true,
        },
      }),
    ]);

    return suscripcionesHace3Meses > 0
      ? Math.round(
          (suscripcionesActualesQueExistianHace3Meses /
            suscripcionesHace3Meses) *
            100 *
            100,
        ) / 100
      : 0;
  }

  /**
   * Calcula ARPU (Average Revenue Per User)
   */
  private async calculateARPU(): Promise<number> {
    const [ingresoTotal, usuariosActivos] = await Promise.all([
      this.calculateIngresosMensuales(),
      this.calculateSuscripcionesActivas(),
    ]);

    return usuariosActivos > 0
      ? Math.round((ingresoTotal / usuariosActivos) * 100) / 100
      : 0;
  }

  /**
   * Calcula LTV (Lifetime Value)
   */
  private async calculateLTV(): Promise<number> {
    const arpu = await this.calculateARPU();
    const tasaRetencion = await this.calculateTasaRetencion();

    // Fórmula simplificada: ARPU / (1 - Tasa de Retención)
    const tasaChurn = (100 - tasaRetencion) / 100;
    return tasaChurn > 0 && tasaChurn < 1
      ? Math.round((arpu / tasaChurn) * 100) / 100
      : arpu * 12; // Fallback: ARPU * 12 meses
  }

  /**
   * Calcula uso actual de una empresa
   */
  private async calculateUsoActual(empresaId: number) {
    const [clientes, productos, usuarios, mensajes] = await Promise.all([
      this.prisma.cliente.count({
        where: {
          empresas: {
            some: { empresa_id: empresaId },
          },
        },
      }),
      this.prisma.productoServicio.count({
        where: { id_empresa: empresaId },
      }),
      this.prisma.usuarioEmpresa.count({
        where: {
          empresa: {
            id_empresa: empresaId,
          },
        },
      }),
      this.calculateMensajesDelMes(empresaId),
    ]);

    return {
      clientes,
      productos,
      usuarios,
      mensajes,
    };
  }

  /**
   * Calcula mensajes del mes actual
   */
  private async calculateMensajesDelMes(empresaId: number): Promise<number> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    return await this.prisma.mensajeWhatsapp.count({
      where: {
        consulta: {
          id_empresa: empresaId,
        },
        fecha_mensaje: {
          gte: inicioMes,
        },
        es_entrante: false,
      },
    });
  }

  /**
   * Calcula historial de pagos
   */
  private async calculateHistorialPagos(suscripcionId: number) {
    const pagos = await this.prisma.pagoSuscripcion.findMany({
      where: { id_suscripcion: suscripcionId },
      orderBy: { fecha_pago: 'desc' },
      take: 12, // Últimos 12 pagos
    });

    return pagos.map((pago) => ({
      fecha_pago: pago.fecha_pago.toISOString().split('T')[0],
      monto_soles: pago.monto,
      metodo_pago: pago.metodo_pago,
      estado: pago.estado_pago,
      referencia: pago.referencia_externa,
    }));
  }

  /**
   * Calcula días restantes de suscripción
   */
  private calculateDiasRestantes(fechaFin: Date): number {
    const ahora = new Date();
    const diferencia = fechaFin.getTime() - ahora.getTime();
    return Math.max(0, Math.ceil(diferencia / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calcula distribución por plan
   */
  private calculateDistribucionPorPlan(suscripciones: any[]) {
    const distribucion = suscripciones.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribucion).map(([plan, cantidad]) => ({
      plan,
      cantidad,
    }));
  }

  /**
   * Calcula razones de churn
   */
  private async calculateRazonesChurn(suscripcionesCanceladas: any[]) {
    // En implementación real, esto vendría de encuestas de cancelación
    // Por ahora, simulamos las razones más comunes en el mercado peruano
    const razones = [
      { razon: 'Precio muy alto', porcentaje: 35 },
      { razon: 'No usa todas las funcionalidades', porcentaje: 25 },
      { razon: 'Encontró alternativa más barata', porcentaje: 20 },
      { razon: 'Problemas técnicos', porcentaje: 10 },
      { razon: 'Cambio de negocio', porcentaje: 10 },
    ];

    return razones;
  }

  /**
   * Estima costos de marketing para Perú
   */
  private estimateMarketingCosts(meses: number): number {
    // Estimación basada en costos típicos de marketing digital en Perú
    const costoPorMes = 2500; // S/ 2,500 por mes
    return costoPorMes * meses;
  }

  /**
   * Estima costos de ventas para Perú
   */
  private estimateSalesCosts(meses: number): number {
    // Estimación basada en costos de equipo de ventas en Perú
    const costoPorMes = 3000; // S/ 3,000 por mes
    return costoPorMes * meses;
  }

  /**
   * Evalúa el CAC calculado
   */
  private evaluateCAC(cac: number): string {
    if (cac <= 150) return 'Excelente - CAC muy bajo';
    if (cac <= 300) return 'Bueno - CAC dentro del promedio';
    if (cac <= 500) return 'Aceptable - CAC algo elevado';
    return 'Alto - Requiere optimización';
  }
}
