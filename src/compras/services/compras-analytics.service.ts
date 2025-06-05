import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Interfaces para analytics de compras
export interface IComprasKPIs {
  gastoTotal: number;
  gastoPromedioPorOrden: number;
  cantidadOrdenes: number;
  cantidadProveedores: number;
  proveedoresMasActivos: Array<{
    nombre: string;
    montoTotal: number;
    cantidadOrdenes: number;
    participacion: number;
  }>;
  categoriasMasCompradas: Array<{
    categoria: string;
    montoTotal: number;
    cantidadItems: number;
    participacion: number;
  }>;
  tendenciaGasto: {
    crecimientoMensual: number;
    proyeccionTrimestral: number;
    comparacionPeriodoAnterior: number;
  };
  eficienciaProveedores: {
    tiempoEntregaPromedio: number;
    tasaCumplimiento: number;
    proveedoresPuntuales: number;
  };
  indicadoresFinancieros: {
    dso: number; // Days Sales Outstanding
    rotacionInventario: number;
    costoAlmacenamiento: number;
  };
}

export interface IDashboardCompras {
  resumenGeneral: {
    gastosHoy: number;
    gastosSemana: number;
    gastosMes: number;
    gastosAño: number;
    presupuestoMes: number;
    cumplimientoPresupuesto: number;
  };
  alertasUrgentes: Array<{
    tipo:
      | 'PRESUPUESTO_EXCEDIDO'
      | 'PROVEEDOR_RETRASADO'
      | 'STOCK_CRITICO'
      | 'PRECIO_INCREMENTADO';
    mensaje: string;
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    fechaDeteccion: Date;
    datos: any;
  }>;
  metricas: IComprasKPIs;
  tendencias: Array<{
    periodo: string;
    gastos: number;
    ordenes: number;
    proveedores: number;
  }>;
  oportunidades: Array<{
    tipo: string;
    descripcion: string;
    impactoEconomico: number;
    facilidadImplementacion: 'FACIL' | 'MODERADA' | 'DIFICIL';
  }>;
}

export interface IPrediccionCompras {
  periodoProyeccion: string;
  gastoEstimado: number;
  rangoMinimo: number;
  rangoMaximo: number;
  confianza: number;
  factoresInfluencia: Array<{
    factor: string;
    impacto: number;
    descripcion: string;
  }>;
  escenarios: {
    optimista: {
      gasto: number;
      descripcion: string;
    };
    realista: {
      gasto: number;
      descripcion: string;
    };
    pesimista: {
      gasto: number;
      descripcion: string;
    };
  };
}

export interface IAnalisisProveedores {
  ranking: Array<{
    proveedor: string;
    score: number;
    fortalezas: string[];
    debilidades: string[];
    recomendacion:
      | 'MANTENER'
      | 'NEGOCIAR'
      | 'EVALUAR_ALTERNATIVAS'
      | 'DISCONTINUAR';
    metricas: {
      puntualidad: number;
      calidad: number;
      precio: number;
      servicio: number;
    };
  }>;
  diversificacion: {
    indiceConcentracion: number;
    proveedoresCriticos: number;
    riesgoSupplyChain: 'BAJO' | 'MEDIO' | 'ALTO';
    recomendaciones: string[];
  };
  oportunidadesMejora: Array<{
    proveedor: string;
    area: string;
    potencialAhorro: number;
    accionRecomendada: string;
  }>;
}

export interface IAnalisisEstacionalidad {
  patronesMensuales: Array<{
    mes: number;
    nombreMes: string;
    gastoPromedio: number;
    indiceCrestadidad: number;
    categoriasPrincipales: string[];
  }>;
  recomendaciones: Array<{
    mes: number;
    accion: string;
    descripcion: string;
    impactoEsperado: number;
  }>;
  tendenciasHistoricas: {
    crecimientoAnual: number;
    volatilidad: number;
    cicloEstacional: boolean;
  };
}

@Injectable()
export class ComprasAnalyticsService {
  private readonly logger = new Logger(ComprasAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula KPIs principales de compras
   */
  async calcularKPIs(
    empresaId: number,
    fechaDesde: Date,
    fechaHasta: Date,
  ): Promise<IComprasKPIs> {
    this.logger.log(`Calculando KPIs de compras para empresa ${empresaId}`);

    const [ordenes, proveedores] = await Promise.all([
      this.prisma.ordenCompra.findMany({
        where: {
          id_empresa: empresaId,
          fecha_emision: {
            gte: fechaDesde,
            lte: fechaHasta,
          },
          estado: { in: ['APROBADA', 'EN_TRANSITO', 'RECIBIDA'] },
        },
        include: {
          proveedor: true,
          items: {
            include: {
              producto: {
                include: {
                  categoria: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.proveedor.findMany({
        where: { empresa_id: empresaId, activo: true },
      }),
    ]);

    const gastoTotal = ordenes.reduce(
      (sum, orden) => sum + Number(orden.total),
      0,
    );
    const cantidadOrdenes = ordenes.length;
    const gastoPromedio =
      cantidadOrdenes > 0 ? gastoTotal / cantidadOrdenes : 0;

    // Análisis de proveedores más activos
    const proveedoresMap = new Map();
    ordenes.forEach((orden) => {
      const key = orden.proveedor.nombre;
      if (!proveedoresMap.has(key)) {
        proveedoresMap.set(key, { monto: 0, ordenes: 0 });
      }
      const data = proveedoresMap.get(key);
      data.monto += Number(orden.total);
      data.ordenes += 1;
    });

    const proveedoresMasActivos = Array.from(proveedoresMap.entries())
      .map(([nombre, data]) => ({
        nombre,
        montoTotal: data.monto,
        cantidadOrdenes: data.ordenes,
        participacion: gastoTotal > 0 ? (data.monto / gastoTotal) * 100 : 0,
      }))
      .sort((a, b) => b.montoTotal - a.montoTotal)
      .slice(0, 5);

    // Análisis de categorías más compradas
    const categoriasMap = new Map();
    ordenes.forEach((orden) => {
      orden.items.forEach((item) => {
        const key = item.producto.categoria.nombre;
        if (!categoriasMap.has(key)) {
          categoriasMap.set(key, { monto: 0, items: 0 });
        }
        const data = categoriasMap.get(key);
        data.monto += Number(item.subtotal);
        data.items += item.cantidad;
      });
    });

    const categoriasMasCompradas = Array.from(categoriasMap.entries())
      .map(([categoria, data]) => ({
        categoria,
        montoTotal: data.monto,
        cantidadItems: data.items,
        participacion: gastoTotal > 0 ? (data.monto / gastoTotal) * 100 : 0,
      }))
      .sort((a, b) => b.montoTotal - a.montoTotal)
      .slice(0, 5);

    // Calcular tendencia (comparación con período anterior)
    const diasPeriodo = Math.ceil(
      (fechaHasta.getTime() - fechaDesde.getTime()) / (1000 * 60 * 60 * 24),
    );
    const fechaAntesDesde = new Date(
      fechaDesde.getTime() - diasPeriodo * 24 * 60 * 60 * 1000,
    );
    const fechaAntesHasta = new Date(
      fechaHasta.getTime() - diasPeriodo * 24 * 60 * 60 * 1000,
    );

    const ordenesAnterior = await this.prisma.ordenCompra.findMany({
      where: {
        id_empresa: empresaId,
        fecha_emision: {
          gte: fechaAntesDesde,
          lte: fechaAntesHasta,
        },
        estado: { in: ['APROBADA', 'EN_TRANSITO', 'RECIBIDA'] },
      },
    });

    const gastoAnterior = ordenesAnterior.reduce(
      (sum, orden) => sum + Number(orden.total),
      0,
    );
    const crecimientoMensual =
      gastoAnterior > 0
        ? ((gastoTotal - gastoAnterior) / gastoAnterior) * 100
        : 0;

    // Métricas de eficiencia de proveedores (simplificado)
    const ordenesRecibidas = ordenes.filter((o) => o.estado === 'RECIBIDA');
    const tiempoEntregaPromedio =
      ordenesRecibidas.length > 0
        ? ordenesRecibidas.reduce((sum, orden) => {
            const tiempoEntrega = orden.fecha_entrega
              ? Math.ceil(
                  (orden.fecha_entrega.getTime() -
                    orden.fecha_emision.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;
            return sum + tiempoEntrega;
          }, 0) / ordenesRecibidas.length
        : 0;

    const tasaCumplimiento =
      ordenes.length > 0 ? (ordenesRecibidas.length / ordenes.length) * 100 : 0;

    return {
      gastoTotal,
      gastoPromedioPorOrden: gastoPromedio,
      cantidadOrdenes,
      cantidadProveedores: proveedores.length,
      proveedoresMasActivos,
      categoriasMasCompradas,
      tendenciaGasto: {
        crecimientoMensual,
        proyeccionTrimestral: gastoTotal * 3,
        comparacionPeriodoAnterior: crecimientoMensual,
      },
      eficienciaProveedores: {
        tiempoEntregaPromedio,
        tasaCumplimiento,
        proveedoresPuntuales: proveedoresMasActivos.length,
      },
      indicadoresFinancieros: {
        dso: tiempoEntregaPromedio,
        rotacionInventario: 12, // Valor estimado
        costoAlmacenamiento: gastoTotal * 0.15, // 15% estimado
      },
    };
  }

  /**
   * Genera dashboard ejecutivo de compras
   */
  async generarDashboard(empresaId: number): Promise<IDashboardCompras> {
    this.logger.log(`Generando dashboard de compras para empresa ${empresaId}`);

    const hoy = new Date();
    const inicioSemana = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioAño = new Date(hoy.getFullYear(), 0, 1);

    const [gastosHoy, gastosSemana, gastosMes, gastosAño] = await Promise.all([
      this.calcularGastosPeriodo(empresaId, hoy, hoy),
      this.calcularGastosPeriodo(empresaId, inicioSemana, hoy),
      this.calcularGastosPeriodo(empresaId, inicioMes, hoy),
      this.calcularGastosPeriodo(empresaId, inicioAño, hoy),
    ]);

    // Simular presupuesto mensual (en un sistema real vendría de configuración)
    const presupuestoMes = gastosMes * 1.2; // 20% más que el gasto actual
    const cumplimientoPresupuesto =
      presupuestoMes > 0 ? (gastosMes / presupuestoMes) * 100 : 0;

    // Generar alertas
    const alertas = await this.generarAlertas(empresaId);

    // Calcular KPIs del mes actual
    const kpisMes = await this.calcularKPIs(empresaId, inicioMes, hoy);

    // Tendencias (últimos 6 meses)
    const tendencias = await this.generarTendencias(empresaId, 6);

    // Oportunidades de mejora
    const oportunidades = await this.identificarOportunidades(empresaId);

    return {
      resumenGeneral: {
        gastosHoy,
        gastosSemana,
        gastosMes,
        gastosAño,
        presupuestoMes,
        cumplimientoPresupuesto,
      },
      alertasUrgentes: alertas,
      metricas: kpisMes,
      tendencias,
      oportunidades,
    };
  }

  /**
   * Genera predicciones de compras usando IA/ML básico
   */
  async predecirCompras(
    empresaId: number,
    mesesAdelante: number = 3,
  ): Promise<IPrediccionCompras[]> {
    this.logger.log(
      `Generando predicciones de compras para ${mesesAdelante} meses`,
    );

    const predicciones: IPrediccionCompras[] = [];

    // Obtener datos históricos (últimos 12 meses)
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 12);

    const gastosHistoricos = await this.obtenerGastosHistoricosMensuales(
      empresaId,
      fechaInicio,
    );

    for (let i = 1; i <= mesesAdelante; i++) {
      const fechaProyeccion = new Date();
      fechaProyeccion.setMonth(fechaProyeccion.getMonth() + i);

      // Algoritmo simple de predicción (en producción sería más sofisticado)
      const promedioHistorico =
        gastosHistoricos.reduce((sum, gasto) => sum + gasto.monto, 0) /
        gastosHistoricos.length;
      const tendencia = this.calcularTendencia(gastosHistoricos);
      const estacionalidad = this.calcularFactorEstacional(
        fechaProyeccion.getMonth(),
        gastosHistoricos,
      );

      const gastoBase = promedioHistorico * (1 + tendencia / 100);
      const gastoEstimado = gastoBase * estacionalidad;

      const volatilidad = this.calcularVolatilidad(gastosHistoricos);
      const rangoMinimo = gastoEstimado * (1 - volatilidad);
      const rangoMaximo = gastoEstimado * (1 + volatilidad);

      predicciones.push({
        periodoProyeccion: `${fechaProyeccion.getFullYear()}-${(fechaProyeccion.getMonth() + 1).toString().padStart(2, '0')}`,
        gastoEstimado,
        rangoMinimo,
        rangoMaximo,
        confianza: Math.max(0.6, 1 - i * 0.1), // Confianza decrece con el tiempo
        factoresInfluencia: [
          {
            factor: 'Tendencia Histórica',
            impacto: tendencia,
            descripcion: `Crecimiento promedio mensual del ${tendencia.toFixed(1)}%`,
          },
          {
            factor: 'Estacionalidad',
            impacto: (estacionalidad - 1) * 100,
            descripcion: `Factor estacional del mes ${fechaProyeccion.getMonth() + 1}`,
          },
          {
            factor: 'Volatilidad',
            impacto: volatilidad * 100,
            descripcion: `Variabilidad histórica del ${(volatilidad * 100).toFixed(1)}%`,
          },
        ],
        escenarios: {
          optimista: {
            gasto: gastoEstimado * 0.85,
            descripcion: 'Negociaciones exitosas y optimización de procesos',
          },
          realista: {
            gasto: gastoEstimado,
            descripcion: 'Continuación de patrones actuales',
          },
          pesimista: {
            gasto: gastoEstimado * 1.2,
            descripcion: 'Incrementos de precios e ineficiencias',
          },
        },
      });
    }

    return predicciones;
  }

  /**
   * Análisis avanzado de proveedores
   */
  async analizarProveedores(empresaId: number): Promise<IAnalisisProveedores> {
    this.logger.log(
      `Analizando rendimiento de proveedores para empresa ${empresaId}`,
    );

    const proveedores = await this.prisma.proveedor.findMany({
      where: { empresa_id: empresaId, activo: true },
      include: {
        ordenes_compra: {
          where: {
            fecha_emision: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Último año
            },
          },
          include: {
            items: true,
          },
        },
      },
    });

    const ranking = proveedores
      .map((proveedor) => {
        const ordenes = proveedor.ordenes_compra;
        const totalOrdenes = ordenes.length;
        const montoTotal = ordenes.reduce(
          (sum, orden) => sum + Number(orden.total),
          0,
        );

        if (totalOrdenes === 0) {
          return null;
        }

        // Calcular métricas (simplificado)
        const ordenesRecibidas = ordenes.filter((o) => o.estado === 'RECIBIDA');
        const puntualidad =
          totalOrdenes > 0 ? (ordenesRecibidas.length / totalOrdenes) * 100 : 0;

        // Simular otras métricas
        const calidad = Math.min(100, puntualidad + Math.random() * 20 - 10);
        const precio = Math.min(100, 100 - montoTotal / totalOrdenes / 1000); // Scoring inverso
        const servicio = Math.min(100, puntualidad + Math.random() * 15 - 7.5);

        const score =
          puntualidad * 0.3 + calidad * 0.25 + precio * 0.25 + servicio * 0.2;

        let recomendacion:
          | 'MANTENER'
          | 'NEGOCIAR'
          | 'EVALUAR_ALTERNATIVAS'
          | 'DISCONTINUAR';
        if (score >= 80) recomendacion = 'MANTENER';
        else if (score >= 60) recomendacion = 'NEGOCIAR';
        else if (score >= 40) recomendacion = 'EVALUAR_ALTERNATIVAS';
        else recomendacion = 'DISCONTINUAR';

        const fortalezas: string[] = [];
        const debilidades: string[] = [];

        if (puntualidad >= 90) fortalezas.push('Excelente puntualidad');
        else if (puntualidad < 70) debilidades.push('Problemas de puntualidad');

        if (montoTotal > 100000) fortalezas.push('Proveedor de alto volumen');
        if (calidad >= 85) fortalezas.push('Alta calidad de productos');
        else if (calidad < 70) debilidades.push('Problemas de calidad');

        return {
          proveedor: proveedor.nombre,
          score,
          fortalezas,
          debilidades,
          recomendacion,
          metricas: {
            puntualidad,
            calidad,
            precio,
            servicio,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score);

    // Análisis de diversificación
    const montoTotalCompras = ranking.reduce(
      (sum, p) => sum + p.metricas.precio * 1000,
      0,
    );
    const indiceConcentracion =
      ranking.length > 0
        ? ((ranking[0].metricas.precio * 1000) / montoTotalCompras) * 100
        : 0;

    let riesgoSupplyChain: 'BAJO' | 'MEDIO' | 'ALTO';
    if (indiceConcentracion < 30) riesgoSupplyChain = 'BAJO';
    else if (indiceConcentracion < 60) riesgoSupplyChain = 'MEDIO';
    else riesgoSupplyChain = 'ALTO';

    const recomendacionesDiversificacion: string[] = [];
    if (riesgoSupplyChain === 'ALTO') {
      recomendacionesDiversificacion.push(
        'Buscar proveedores alternativos para reducir dependencia',
      );
    }
    if (ranking.length < 3) {
      recomendacionesDiversificacion.push(
        'Ampliar base de proveedores para mejorar competencia',
      );
    }

    // Oportunidades de mejora
    const oportunidadesMejora = ranking
      .filter((p) => p.score < 80)
      .map((p) => ({
        proveedor: p.proveedor,
        area: p.debilidades[0] || 'Mejora general',
        potencialAhorro: Math.random() * 50000 + 10000, // Simulado
        accionRecomendada:
          p.recomendacion === 'NEGOCIAR'
            ? 'Renegociar términos y condiciones'
            : 'Evaluar alternativas',
      }));

    return {
      ranking,
      diversificacion: {
        indiceConcentracion,
        proveedoresCriticos: ranking.filter(
          (p) => p.metricas.precio * 1000 > montoTotalCompras * 0.2,
        ).length,
        riesgoSupplyChain,
        recomendaciones: recomendacionesDiversificacion,
      },
      oportunidadesMejora,
    };
  }

  /**
   * Análisis de estacionalidad de compras
   */
  async analizarEstacionalidad(
    empresaId: number,
  ): Promise<IAnalisisEstacionalidad> {
    this.logger.log(
      `Analizando patrones estacionales para empresa ${empresaId}`,
    );

    // Obtener datos de los últimos 2 años para análisis estacional
    const fechaInicio = new Date();
    fechaInicio.setFullYear(fechaInicio.getFullYear() - 2);

    const comprasMensuales = await this.prisma.ordenCompra.groupBy({
      by: ['fecha_emision'],
      where: {
        id_empresa: empresaId,
        fecha_emision: { gte: fechaInicio },
        estado: { in: ['APROBADA', 'EN_TRANSITO', 'RECIBIDA'] },
      },
      _sum: { total: true },
      _count: { _all: true },
    });

    // Agrupar por mes
    const gastosPorMes: Array<{
      mes: number;
      nombreMes: string;
      gastos: number[];
      cantidades: number[];
    }> = new Array(12).fill(0).map((_, index) => ({
      mes: index + 1,
      nombreMes: new Date(2024, index).toLocaleString('es', { month: 'long' }),
      gastos: [] as number[],
      cantidades: [] as number[],
    }));

    comprasMensuales.forEach((compra) => {
      const mes = compra.fecha_emision.getMonth();
      gastosPorMes[mes].gastos.push(Number(compra._sum.total) || 0);
      gastosPorMes[mes].cantidades.push(compra._count._all);
    });

    const patronesMensuales = gastosPorMes.map((mes) => {
      const gastoPromedio =
        mes.gastos.length > 0
          ? mes.gastos.reduce((sum, g) => sum + g, 0) / mes.gastos.length
          : 0;

      const gastoTotal = mes.gastos.reduce((sum, g) => sum + g, 0);
      const promedioAnual =
        comprasMensuales.reduce(
          (sum, c) => sum + Number(c._sum.total || 0),
          0,
        ) / 12;

      const indiceCrestadidad =
        promedioAnual > 0 ? gastoPromedio / promedioAnual : 0;

      return {
        mes: mes.mes,
        nombreMes: mes.nombreMes,
        gastoPromedio,
        indiceCrestadidad,
        categoriasPrincipales: ['Materiales', 'Servicios', 'Tecnología'], // Simplificado
      };
    });

    // Generar recomendaciones
    const recomendaciones = patronesMensuales
      .filter((p) => p.indiceCrestadidad > 1.2 || p.indiceCrestadidad < 0.8)
      .map((p) => ({
        mes: p.mes,
        accion:
          p.indiceCrestadidad > 1.2
            ? 'Planificar compras anticipadas'
            : 'Aprovechar precios bajos',
        descripcion:
          p.indiceCrestadidad > 1.2
            ? `${p.nombreMes} muestra alto volumen de compras, considerar negociaciones especiales`
            : `${p.nombreMes} es un buen momento para compras no urgentes`,
        impactoEsperado: Math.abs(p.indiceCrestadidad - 1) * 100000, // Simplificado
      }));

    return {
      patronesMensuales,
      recomendaciones,
      tendenciasHistoricas: {
        crecimientoAnual: 8.5, // Simplificado
        volatilidad: 0.15,
        cicloEstacional: true,
      },
    };
  }

  // Métodos auxiliares privados

  private async calcularGastosPeriodo(
    empresaId: number,
    desde: Date,
    hasta: Date,
  ): Promise<number> {
    const resultado = await this.prisma.ordenCompra.aggregate({
      where: {
        id_empresa: empresaId,
        fecha_emision: { gte: desde, lte: hasta },
        estado: { in: ['APROBADA', 'EN_TRANSITO', 'RECIBIDA'] },
      },
      _sum: { total: true },
    });

    return Number(resultado._sum.total) || 0;
  }

  private async generarAlertas(empresaId: number) {
    const alertas: Array<{
      tipo:
        | 'PRESUPUESTO_EXCEDIDO'
        | 'PROVEEDOR_RETRASADO'
        | 'STOCK_CRITICO'
        | 'PRECIO_INCREMENTADO';
      mensaje: string;
      prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
      fechaDeteccion: Date;
      datos: any;
    }> = [];

    // Simular algunas alertas comunes
    const gastosEsteMes = await this.calcularGastosPeriodo(
      empresaId,
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(),
    );

    if (gastosEsteMes > 500000) {
      // Umbral simulado
      alertas.push({
        tipo: 'PRESUPUESTO_EXCEDIDO' as const,
        mensaje: 'Los gastos del mes han superado el presupuesto establecido',
        prioridad: 'ALTA' as const,
        fechaDeteccion: new Date(),
        datos: { gastoActual: gastosEsteMes, presupuesto: 450000 },
      });
    }

    return alertas;
  }

  private async generarTendencias(empresaId: number, meses: number) {
    const tendencias: Array<{
      periodo: string;
      gastos: number;
      ordenes: number;
      proveedores: number;
    }> = [];

    for (let i = meses - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      const gastos = await this.calcularGastosPeriodo(
        empresaId,
        inicioMes,
        finMes,
      );

      const ordenes = await this.prisma.ordenCompra.count({
        where: {
          id_empresa: empresaId,
          fecha_emision: { gte: inicioMes, lte: finMes },
        },
      });

      const proveedores = await this.prisma.ordenCompra.groupBy({
        by: ['id_proveedor'],
        where: {
          id_empresa: empresaId,
          fecha_emision: { gte: inicioMes, lte: finMes },
        },
      });

      tendencias.push({
        periodo: `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`,
        gastos,
        ordenes,
        proveedores: proveedores.length,
      });
    }

    return tendencias;
  }

  private async identificarOportunidades(empresaId: number) {
    return [
      {
        tipo: 'Consolidación de Proveedores',
        descripcion:
          'Reducir el número de proveedores para obtener mejores precios por volumen',
        impactoEconomico: 75000,
        facilidadImplementacion: 'MODERADA' as const,
      },
      {
        tipo: 'Automatización de Procesos',
        descripcion:
          'Implementar aprobaciones automáticas para órdenes de bajo valor',
        impactoEconomico: 25000,
        facilidadImplementacion: 'FACIL' as const,
      },
    ];
  }

  private async obtenerGastosHistoricosMensuales(
    empresaId: number,
    fechaInicio: Date,
  ) {
    const gastos = await this.prisma.ordenCompra.groupBy({
      by: ['fecha_emision'],
      where: {
        id_empresa: empresaId,
        fecha_emision: { gte: fechaInicio },
        estado: { in: ['APROBADA', 'EN_TRANSITO', 'RECIBIDA'] },
      },
      _sum: { total: true },
    });

    // Agrupar por mes
    const gastosMensuales = new Map();
    gastos.forEach((gasto) => {
      const mesAño = `${gasto.fecha_emision.getFullYear()}-${gasto.fecha_emision.getMonth()}`;
      if (!gastosMensuales.has(mesAño)) {
        gastosMensuales.set(mesAño, 0);
      }
      gastosMensuales.set(
        mesAño,
        gastosMensuales.get(mesAño) + Number(gasto._sum.total || 0),
      );
    });

    return Array.from(gastosMensuales.entries()).map(([periodo, monto]) => ({
      periodo,
      monto,
    }));
  }

  private calcularTendencia(
    gastosHistoricos: Array<{ periodo: string; monto: number }>,
  ): number {
    if (gastosHistoricos.length < 2) return 0;

    const primerPeriodo = gastosHistoricos[0].monto;
    const ultimoPeriodo = gastosHistoricos[gastosHistoricos.length - 1].monto;

    if (primerPeriodo === 0) return 0;

    return (
      (((ultimoPeriodo - primerPeriodo) / primerPeriodo) * 100) /
      gastosHistoricos.length
    );
  }

  private calcularFactorEstacional(
    mes: number,
    gastosHistoricos: Array<{ periodo: string; monto: number }>,
  ): number {
    // Simplificado: algunos meses tienen mayor actividad
    const factoresEstacionales = [
      1.1, // Enero - inicio de año
      0.9, // Febrero
      1.0, // Marzo
      1.0, // Abril
      1.1, // Mayo
      0.9, // Junio
      0.8, // Julio - vacaciones
      0.8, // Agosto - vacaciones
      1.2, // Septiembre - retorno actividad
      1.1, // Octubre
      1.2, // Noviembre - preparación fin de año
      0.9, // Diciembre - fiestas
    ];

    return factoresEstacionales[mes] || 1.0;
  }

  private calcularVolatilidad(
    gastosHistoricos: Array<{ periodo: string; monto: number }>,
  ): number {
    if (gastosHistoricos.length < 2) return 0.1;

    const promedio =
      gastosHistoricos.reduce((sum, g) => sum + g.monto, 0) /
      gastosHistoricos.length;
    const varianza =
      gastosHistoricos.reduce(
        (sum, g) => sum + Math.pow(g.monto - promedio, 2),
        0,
      ) / gastosHistoricos.length;
    const desviacionEstandar = Math.sqrt(varianza);

    return promedio > 0 ? desviacionEstandar / promedio : 0.1;
  }
}
