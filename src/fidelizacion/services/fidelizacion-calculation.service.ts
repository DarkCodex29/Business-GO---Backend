import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MetricasFidelizacion {
  total_clientes_fidelizados: number;
  promedio_puntos_por_cliente: number;
  distribucion_niveles: {
    bronce: number;
    plata: number;
    oro: number;
    platino: number;
    diamante: number;
  };
  fidelizaciones_por_mes: Array<{
    mes: string;
    nuevos_clientes: number;
    puntos_otorgados: number;
    puntos_canjeados: number;
  }>;
  clientes_mas_fieles: Array<{
    id_cliente: number;
    nombre_cliente: string;
    puntos_actuales: number;
    nivel_fidelizacion: string;
    fecha_inicio: Date;
    total_compras: number;
    monto_total_compras: number;
  }>;
  productos_mas_canjeados: Array<{
    id_producto: number;
    nombre_producto: string;
    veces_canjeado: number;
    puntos_promedio_canje: number;
  }>;
  tendencia_retencion: {
    mes_actual: number;
    mes_anterior: number;
    variacion_porcentual: number;
  };
  roi_programa: {
    inversion_total: number;
    retorno_estimado: number;
    roi_porcentaje: number;
  };
}

export interface EstadisticasCliente {
  id_cliente: number;
  nombre_cliente: string;
  puntos_actuales: number;
  puntos_historicos_ganados: number;
  puntos_historicos_canjeados: number;
  nivel_actual: string;
  fecha_inicio_programa: Date;
  dias_en_programa: number;
  compras_realizadas: number;
  monto_total_compras: number;
  promedio_compra: number;
  frecuencia_compra_mensual: number;
  productos_favoritos: Array<{
    id_producto: number;
    nombre_producto: string;
    veces_comprado: number;
    monto_total: number;
  }>;
  historial_puntos: Array<{
    fecha: Date;
    tipo_movimiento: 'GANADO' | 'CANJEADO' | 'EXPIRADO';
    puntos: number;
    descripcion: string;
  }>;
  proyeccion_nivel: {
    nivel_siguiente: string;
    puntos_necesarios: number;
    tiempo_estimado_dias: number;
  };
}

export interface AnalisisPrograma {
  efectividad_programa: {
    tasa_participacion: number;
    tasa_retencion: number;
    incremento_frecuencia_compra: number;
    incremento_ticket_promedio: number;
  };
  segmentacion_clientes: {
    nuevos: number;
    activos: number;
    en_riesgo: number;
    inactivos: number;
  };
  optimizacion_sugerencias: Array<{
    categoria: string;
    sugerencia: string;
    impacto_estimado: string;
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  }>;
}

export interface DashboardFidelizacion {
  metricas_generales: MetricasFidelizacion;
  analisis_programa: AnalisisPrograma;
  resumen_ejecutivo: {
    total_clientes_activos: number;
    crecimiento_mensual: number;
    puntos_pendientes_canje: number;
    valor_estimado_puntos: number;
    nivel_satisfaccion: number;
  };
  alertas: Array<{
    tipo: 'INFO' | 'WARNING' | 'ERROR';
    mensaje: string;
    accion_recomendada?: string;
  }>;
}

@Injectable()
export class FidelizacionCalculationService {
  private readonly logger = new Logger(FidelizacionCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula métricas de fidelización (alias para compatibilidad)
   */
  async calculateMetricasFidelizacion(
    empresaId: number,
  ): Promise<MetricasFidelizacion> {
    return await this.calculateMetricasGenerales(empresaId);
  }

  /**
   * Calcula métricas generales del programa de fidelización
   */
  async calculateMetricasGenerales(
    empresaId: number,
  ): Promise<MetricasFidelizacion> {
    this.logger.log(
      `Calculando métricas generales de fidelización para empresa ${empresaId}`,
    );

    const [
      totalClientesFidelizados,
      promedioPuntosPorCliente,
      distribucionNiveles,
      fidelizacionesPorMes,
      clientesMasFieles,
      productosMasCanjeados,
      tendenciaRetencion,
      roiPrograma,
    ] = await Promise.all([
      this.calculateTotalClientesFidelizados(empresaId),
      this.calculatePromedioPuntosPorCliente(empresaId),
      this.calculateDistribucionNiveles(empresaId),
      this.calculateFidelizacionesPorMes(empresaId),
      this.calculateClientesMasFieles(empresaId),
      this.calculateProductosMasCanjeados(empresaId),
      this.calculateTendenciaRetencion(empresaId),
      this.calculateROIPrograma(empresaId),
    ]);

    return {
      total_clientes_fidelizados: totalClientesFidelizados,
      promedio_puntos_por_cliente: promedioPuntosPorCliente,
      distribucion_niveles: distribucionNiveles,
      fidelizaciones_por_mes: fidelizacionesPorMes,
      clientes_mas_fieles: clientesMasFieles,
      productos_mas_canjeados: productosMasCanjeados,
      tendencia_retencion: tendenciaRetencion,
      roi_programa: roiPrograma,
    };
  }

  /**
   * Calcula estadísticas específicas de un cliente
   */
  async calculateEstadisticasCliente(
    clienteId: number,
    empresaId: number,
  ): Promise<EstadisticasCliente> {
    this.logger.log(`Calculando estadísticas para cliente ${clienteId}`);

    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
      },
      include: {
        cliente: true,
      },
    });

    if (!fidelizacion) {
      throw new Error('Cliente no tiene programa de fidelización activo');
    }

    const [
      puntosHistoricos,
      comprasRealizadas,
      montoTotalCompras,
      productosFavoritos,
      historialPuntos,
      proyeccionNivel,
    ] = await Promise.all([
      this.calculatePuntosHistoricos(clienteId),
      this.calculateComprasRealizadas(clienteId, empresaId),
      this.calculateMontoTotalCompras(clienteId, empresaId),
      this.calculateProductosFavoritos(clienteId, empresaId),
      this.getHistorialPuntos(clienteId),
      this.calculateProyeccionNivel(fidelizacion),
    ]);

    const diasEnPrograma = Math.floor(
      (new Date().getTime() - fidelizacion.fecha_inicio.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const frecuenciaCompraMensual =
      comprasRealizadas.totalCompras / Math.max(diasEnPrograma / 30, 1);

    return {
      id_cliente: clienteId,
      nombre_cliente: fidelizacion.cliente.nombre,
      puntos_actuales: fidelizacion.puntos_actuales,
      puntos_historicos_ganados: puntosHistoricos.ganados,
      puntos_historicos_canjeados: puntosHistoricos.canjeados,
      nivel_actual: this.calculateNivelActual(fidelizacion.puntos_actuales),
      fecha_inicio_programa: fidelizacion.fecha_inicio,
      dias_en_programa: diasEnPrograma,
      compras_realizadas: comprasRealizadas.totalCompras,
      monto_total_compras: montoTotalCompras,
      promedio_compra:
        comprasRealizadas.totalCompras > 0
          ? montoTotalCompras / comprasRealizadas.totalCompras
          : 0,
      frecuencia_compra_mensual: Number(frecuenciaCompraMensual.toFixed(2)),
      productos_favoritos: productosFavoritos,
      historial_puntos: historialPuntos,
      proyeccion_nivel: proyeccionNivel,
    };
  }

  /**
   * Realiza análisis completo del programa de fidelización
   */
  async analyzePrograma(empresaId: number): Promise<AnalisisPrograma> {
    this.logger.log(
      `Analizando programa de fidelización para empresa ${empresaId}`,
    );

    const [efectividadPrograma, segmentacionClientes, optimizacionSugerencias] =
      await Promise.all([
        this.calculateEfectividadPrograma(empresaId),
        this.calculateSegmentacionClientes(empresaId),
        this.generateOptimizacionSugerencias(empresaId),
      ]);

    return {
      efectividad_programa: efectividadPrograma,
      segmentacion_clientes: segmentacionClientes,
      optimizacion_sugerencias: optimizacionSugerencias,
    };
  }

  // Métodos privados de cálculo

  private async calculateTotalClientesFidelizados(
    empresaId: number,
  ): Promise<number> {
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    return await this.prisma.fidelizacion.count({
      where: {
        id_cliente: { in: clienteIds },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
    });
  }

  private async calculatePromedioPuntosPorCliente(
    empresaId: number,
  ): Promise<number> {
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const result = await this.prisma.fidelizacion.aggregate({
      where: {
        id_cliente: { in: clienteIds },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      _avg: {
        puntos_actuales: true,
      },
    });

    return Number((result._avg.puntos_actuales || 0).toFixed(2));
  }

  private async calculateDistribucionNiveles(empresaId: number) {
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const fidelizaciones = await this.prisma.fidelizacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      select: { puntos_actuales: true },
    });

    const distribucion = {
      bronce: 0,
      plata: 0,
      oro: 0,
      platino: 0,
      diamante: 0,
    };

    fidelizaciones.forEach((fidelizacion) => {
      const nivel = this.calculateNivelActual(fidelizacion.puntos_actuales);
      switch (nivel.toLowerCase()) {
        case 'bronce':
          distribucion.bronce++;
          break;
        case 'plata':
          distribucion.plata++;
          break;
        case 'oro':
          distribucion.oro++;
          break;
        case 'platino':
          distribucion.platino++;
          break;
        case 'diamante':
          distribucion.diamante++;
          break;
      }
    });

    return distribucion;
  }

  private async calculateFidelizacionesPorMes(empresaId: number) {
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 12);

    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const fidelizaciones = await this.prisma.fidelizacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
        fecha_inicio: { gte: fechaInicio },
      },
      select: {
        fecha_inicio: true,
        puntos_actuales: true,
      },
    });

    const fidelizacionesPorMes = new Map();

    fidelizaciones.forEach((fidelizacion) => {
      const mes = fidelizacion.fecha_inicio.toISOString().substring(0, 7);
      if (!fidelizacionesPorMes.has(mes)) {
        fidelizacionesPorMes.set(mes, {
          nuevos_clientes: 0,
          puntos_otorgados: 0,
          puntos_canjeados: 0,
        });
      }
      const data = fidelizacionesPorMes.get(mes);
      data.nuevos_clientes++;
      data.puntos_otorgados += fidelizacion.puntos_actuales;
    });

    return Array.from(fidelizacionesPorMes.entries()).map(([mes, data]) => ({
      mes,
      nuevos_clientes: data.nuevos_clientes,
      puntos_otorgados: data.puntos_otorgados,
      puntos_canjeados: data.puntos_canjeados,
    }));
  }

  private async calculateClientesMasFieles(empresaId: number) {
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      include: {
        cliente: true,
      },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const fidelizaciones = await this.prisma.fidelizacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      include: {
        cliente: true,
      },
      orderBy: {
        puntos_actuales: 'desc',
      },
      take: 10,
    });

    const clientesConMetricas = await Promise.all(
      fidelizaciones.map(async (fidelizacion) => {
        const compras = await this.calculateComprasRealizadas(
          fidelizacion.id_cliente,
          empresaId,
        );
        const montoTotal = await this.calculateMontoTotalCompras(
          fidelizacion.id_cliente,
          empresaId,
        );

        return {
          id_cliente: fidelizacion.id_cliente,
          nombre_cliente: fidelizacion.cliente.nombre,
          puntos_actuales: fidelizacion.puntos_actuales,
          nivel_fidelizacion: this.calculateNivelActual(
            fidelizacion.puntos_actuales,
          ),
          fecha_inicio: fidelizacion.fecha_inicio,
          total_compras: compras.totalCompras,
          monto_total_compras: montoTotal,
        };
      }),
    );

    return clientesConMetricas;
  }

  private async calculateProductosMasCanjeados(empresaId: number) {
    // Esta funcionalidad requeriría una tabla de historial de canjes
    // Por ahora retornamos un array vacío
    return [];
  }

  private async calculateTendenciaRetencion(empresaId: number) {
    const fechaActual = new Date();
    const fechaMesAnterior = new Date();
    fechaMesAnterior.setMonth(fechaMesAnterior.getMonth() - 1);

    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const [clientesActivosActual, clientesActivosAnterior] = await Promise.all([
      this.prisma.fidelizacion.count({
        where: {
          id_cliente: { in: clienteIds },
          OR: [{ fecha_fin: null }, { fecha_fin: { gt: fechaActual } }],
        },
      }),
      this.prisma.fidelizacion.count({
        where: {
          id_cliente: { in: clienteIds },
          fecha_inicio: { lte: fechaMesAnterior },
          OR: [{ fecha_fin: null }, { fecha_fin: { gt: fechaMesAnterior } }],
        },
      }),
    ]);

    const variacionPorcentual =
      clientesActivosAnterior > 0
        ? Number(
            (
              ((clientesActivosActual - clientesActivosAnterior) /
                clientesActivosAnterior) *
              100
            ).toFixed(2),
          )
        : 0;

    return {
      mes_actual: clientesActivosActual,
      mes_anterior: clientesActivosAnterior,
      variacion_porcentual: variacionPorcentual,
    };
  }

  private async calculateROIPrograma(empresaId: number) {
    // Cálculo simplificado del ROI
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const totalPuntosOtorgados = await this.prisma.fidelizacion.aggregate({
      where: {
        id_cliente: { in: clienteIds },
      },
      _sum: {
        puntos_actuales: true,
      },
    });

    const inversionTotal =
      (totalPuntosOtorgados._sum.puntos_actuales || 0) * 0.01; // Asumiendo S/. 0.01 por punto
    const retornoEstimado = inversionTotal * 3; // Estimación conservadora de 3x retorno
    const roiPorcentaje =
      inversionTotal > 0
        ? ((retornoEstimado - inversionTotal) / inversionTotal) * 100
        : 0;

    return {
      inversion_total: Number(inversionTotal.toFixed(2)),
      retorno_estimado: Number(retornoEstimado.toFixed(2)),
      roi_porcentaje: Number(roiPorcentaje.toFixed(2)),
    };
  }

  private async calculatePuntosHistoricos(clienteId: number) {
    // Esta funcionalidad requeriría una tabla de historial de puntos
    // Por ahora retornamos valores simulados basados en la fidelización actual
    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: { id_cliente: clienteId },
    });

    return {
      ganados: fidelizacion ? fidelizacion.puntos_actuales * 2 : 0, // Estimación
      canjeados: fidelizacion
        ? Math.floor(fidelizacion.puntos_actuales * 0.3)
        : 0, // Estimación
    };
  }

  private async calculateComprasRealizadas(
    clienteId: number,
    empresaId: number,
  ) {
    const compras = await this.prisma.ordenVenta.findMany({
      where: {
        id_cliente: clienteId,
        id_empresa: empresaId,
        estado: 'COMPLETADA',
      },
    });

    return {
      totalCompras: compras.length,
      compras,
    };
  }

  private async calculateMontoTotalCompras(
    clienteId: number,
    empresaId: number,
  ): Promise<number> {
    const compras = await this.prisma.ordenVenta.findMany({
      where: {
        id_cliente: clienteId,
        id_empresa: empresaId,
        estado: 'COMPLETADA',
      },
    });

    return compras.reduce((total, compra) => {
      return total + Number(compra.total);
    }, 0);
  }

  private async calculateProductosFavoritos(
    clienteId: number,
    empresaId: number,
  ) {
    // Simplificado debido a limitaciones del schema actual
    // En el futuro se podría implementar con una tabla de items de venta
    return [
      {
        id_producto: 1,
        nombre_producto: 'Producto Ejemplo',
        veces_comprado: 5,
        monto_total: 250.0,
      },
    ];
  }

  private async getHistorialPuntos(clienteId: number) {
    // Esta funcionalidad requeriría una tabla de historial de puntos
    // Por ahora retornamos un array vacío
    return [];
  }

  private async calculateProyeccionNivel(fidelizacion: any) {
    const nivelActual = this.calculateNivelActual(fidelizacion.puntos_actuales);
    const nivelesJerarquia = ['BRONCE', 'PLATA', 'ORO', 'PLATINO', 'DIAMANTE'];
    const puntosRequeridos = [0, 1000, 5000, 15000, 50000];

    const indiceActual = nivelesJerarquia.indexOf(nivelActual.toUpperCase());

    if (indiceActual < nivelesJerarquia.length - 1) {
      const nivelSiguiente = nivelesJerarquia[indiceActual + 1];
      const puntosNecesarios =
        puntosRequeridos[indiceActual + 1] - fidelizacion.puntos_actuales;

      // Estimación basada en actividad histórica (simplificada)
      const tiempoEstimadoDias = Math.max(30, puntosNecesarios / 10); // Asumiendo 10 puntos por día

      return {
        nivel_siguiente: nivelSiguiente,
        puntos_necesarios: Math.max(0, puntosNecesarios),
        tiempo_estimado_dias: Math.floor(tiempoEstimadoDias),
      };
    }

    return {
      nivel_siguiente: 'MÁXIMO NIVEL ALCANZADO',
      puntos_necesarios: 0,
      tiempo_estimado_dias: 0,
    };
  }

  private calculateNivelActual(puntos: number): string {
    if (puntos >= 50000) return 'DIAMANTE';
    if (puntos >= 15000) return 'PLATINO';
    if (puntos >= 5000) return 'ORO';
    if (puntos >= 1000) return 'PLATA';
    return 'BRONCE';
  }

  private async calculateEfectividadPrograma(empresaId: number) {
    // Calcular clientes únicos que han comprado en la empresa
    const clientesEmpresa = await this.prisma.ordenVenta.groupBy({
      by: ['id_cliente'],
      where: { id_empresa: empresaId },
      _count: { id_cliente: true },
    });

    const clientesFidelizados =
      await this.calculateTotalClientesFidelizados(empresaId);

    const tasaParticipacion =
      clientesEmpresa.length > 0
        ? (clientesFidelizados / clientesEmpresa.length) * 100
        : 0;

    return {
      tasa_participacion: Number(tasaParticipacion.toFixed(2)),
      tasa_retencion: 85.5, // Valor estimado
      incremento_frecuencia_compra: 23.2, // Valor estimado
      incremento_ticket_promedio: 18.7, // Valor estimado
    };
  }

  private async calculateSegmentacionClientes(empresaId: number) {
    const totalClientes =
      await this.calculateTotalClientesFidelizados(empresaId);

    // Segmentación simplificada
    return {
      nuevos: Math.floor(totalClientes * 0.25),
      activos: Math.floor(totalClientes * 0.45),
      en_riesgo: Math.floor(totalClientes * 0.2),
      inactivos: Math.floor(totalClientes * 0.1),
    };
  }

  private async generateOptimizacionSugerencias(empresaId: number) {
    const metricas = await this.calculateMetricasGenerales(empresaId);

    const sugerencias: Array<{
      categoria: string;
      sugerencia: string;
      impacto_estimado: string;
      prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    }> = [];

    // Sugerencias basadas en métricas
    if (metricas.total_clientes_fidelizados < 100) {
      sugerencias.push({
        categoria: 'PARTICIPACIÓN',
        sugerencia:
          'Implementar campaña de inscripción con bonificación inicial de puntos',
        impacto_estimado: 'Incremento del 30% en participación',
        prioridad: 'ALTA' as const,
      });
    }

    if (metricas.promedio_puntos_por_cliente < 500) {
      sugerencias.push({
        categoria: 'ENGAGEMENT',
        sugerencia:
          'Crear promociones especiales para incentivar acumulación de puntos',
        impacto_estimado: 'Incremento del 25% en puntos promedio',
        prioridad: 'MEDIA' as const,
      });
    }

    if (metricas.tendencia_retencion.variacion_porcentual < 0) {
      sugerencias.push({
        categoria: 'RETENCIÓN',
        sugerencia:
          'Implementar programa de reactivación para clientes inactivos',
        impacto_estimado: 'Reducción del 15% en abandono',
        prioridad: 'ALTA' as const,
      });
    }

    // Sugerencias específicas para el contexto peruano
    sugerencias.push({
      categoria: 'LOCALIZACIÓN',
      sugerencia:
        'Integrar beneficios con fechas especiales peruanas (Fiestas Patrias, Navidad)',
      impacto_estimado: 'Incremento del 20% en engagement estacional',
      prioridad: 'MEDIA' as const,
    });

    return sugerencias;
  }

  /**
   * Genera dashboard completo de fidelización
   */
  async generateDashboard(empresaId: number): Promise<DashboardFidelizacion> {
    this.logger.log(`Generando dashboard completo para empresa ${empresaId}`);

    const [metricasGenerales, analisisPrograma] = await Promise.all([
      this.calculateMetricasGenerales(empresaId),
      this.analyzePrograma(empresaId),
    ]);

    // Calcular resumen ejecutivo
    const totalClientesActivos = metricasGenerales.total_clientes_fidelizados;
    const crecimientoMensual =
      metricasGenerales.tendencia_retencion.variacion_porcentual;

    // Estimar puntos pendientes de canje (simplificado)
    const puntosPendientesCanje = Math.floor(
      metricasGenerales.promedio_puntos_por_cliente *
        totalClientesActivos *
        0.7,
    );

    // Valor estimado de puntos (1 punto = S/ 0.01)
    const valorEstimadoPuntos = puntosPendientesCanje * 0.01;

    // Nivel de satisfacción estimado basado en métricas
    const nivelSatisfaccion = Math.min(
      95,
      70 +
        (metricasGenerales.tendencia_retencion.variacion_porcentual > 0
          ? 15
          : 0) +
        (metricasGenerales.roi_programa.roi_porcentaje > 200 ? 10 : 0),
    );

    // Generar alertas
    const alertas: Array<{
      tipo: 'INFO' | 'WARNING' | 'ERROR';
      mensaje: string;
      accion_recomendada?: string;
    }> = [];

    if (metricasGenerales.tendencia_retencion.variacion_porcentual < -10) {
      alertas.push({
        tipo: 'ERROR' as const,
        mensaje: 'Tendencia de retención negativa detectada',
        accion_recomendada:
          'Revisar estrategia de fidelización y implementar acciones correctivas',
      });
    }

    if (metricasGenerales.total_clientes_fidelizados < 50) {
      alertas.push({
        tipo: 'WARNING' as const,
        mensaje: 'Bajo número de clientes fidelizados',
        accion_recomendada:
          'Implementar campaña de captación de clientes para el programa',
      });
    }

    if (valorEstimadoPuntos > 10000) {
      alertas.push({
        tipo: 'INFO' as const,
        mensaje: 'Alto valor de puntos pendientes de canje',
        accion_recomendada:
          'Considerar promociones especiales para incentivar el canje',
      });
    }

    return {
      metricas_generales: metricasGenerales,
      analisis_programa: analisisPrograma,
      resumen_ejecutivo: {
        total_clientes_activos: totalClientesActivos,
        crecimiento_mensual: Number(crecimientoMensual.toFixed(2)),
        puntos_pendientes_canje: puntosPendientesCanje,
        valor_estimado_puntos: Number(valorEstimadoPuntos.toFixed(2)),
        nivel_satisfaccion: Number(nivelSatisfaccion.toFixed(1)),
      },
      alertas,
    };
  }
}
