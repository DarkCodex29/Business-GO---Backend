import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Interfaces para analytics de clientes
export interface IClienteSegmentacion {
  segmento: string;
  descripcion: string;
  cantidad: number;
  porcentaje: number;
  caracteristicas: string[];
  valorPromedio: number;
  frecuenciaCompra: number;
  tendencia: 'CRECIENTE' | 'ESTABLE' | 'DECRECIENTE';
}

export interface IClienteMetricas {
  totalClientes: number;
  clientesActivos: number;
  clientesNuevos: number;
  tasaRetencion: number;
  tasaChurn: number;
  valorVidaPromedio: number;
  frecuenciaCompraPromedio: number;
  ingresosPorCliente: number;
  segmentacion: IClienteSegmentacion[];
  topClientes: Array<{
    nombre: string;
    valorTotal: number;
    cantidadCompras: number;
    ultimaCompra: Date;
    score: number;
  }>;
  tendenciasComportamiento: {
    crecimientoMensual: number;
    estacionalidad: Array<{
      mes: number;
      actividad: number;
    }>;
    patronesCompra: string[];
  };
}

export interface IClienteScore {
  clienteId: number;
  nombre: string;
  email: string;
  score: number;
  nivel: 'VIP' | 'PREMIUM' | 'REGULAR' | 'BASICO' | 'RIESGO';
  factores: {
    recencia: number;
    frecuencia: number;
    valor: number;
    engagement: number;
    lealtad: number;
  };
  recomendaciones: string[];
  probabilidadChurn: number;
  valorVidaEstimado: number;
  proximasAcciones: Array<{
    accion: string;
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    fechaSugerida: Date;
  }>;
}

export interface ICustomerJourney {
  clienteId: number;
  etapas: Array<{
    etapa:
      | 'PROSPECTO'
      | 'PRIMER_CONTACTO'
      | 'INTERES'
      | 'EVALUACION'
      | 'COMPRA'
      | 'RETENCION'
      | 'ADVOCACY';
    fecha: Date;
    descripcion: string;
    canal: string;
    duracion?: number;
    valor?: number;
  }>;
  etapaActual: string;
  tiempoEnEtapaActual: number;
  probabilidadAvance: number;
  accionesRecomendadas: string[];
  puntosCriticos: string[];
}

export interface IAnalisisComportamiento {
  patronesCompra: {
    horarioPreferido: string;
    diasPreferidos: string[];
    frecuenciaPromedio: number;
    estacionalidad: boolean;
  };
  preferenciasProductos: Array<{
    categoria: string;
    porcentajeCompras: number;
    valorPromedio: number;
  }>;
  canalesPreferidos: Array<{
    canal: string;
    utilizacion: number;
    conversion: number;
  }>;
  sensibilidadPrecio: 'ALTA' | 'MEDIA' | 'BAJA';
  respuestaPromociones: {
    tasaRespuesta: number;
    tiposEfectivos: string[];
  };
}

@Injectable()
export class ClientesAnalyticsService {
  private readonly logger = new Logger(ClientesAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula métricas avanzadas de CRM
   */
  async calcularMetricasClientes(empresaId: number): Promise<IClienteMetricas> {
    this.logger.log(`Calculando métricas CRM para empresa ${empresaId}`);

    const [clientes, historialCompras, valoraciones] = await Promise.all([
      this.prisma.cliente.findMany({
        where: {
          empresas: {
            some: { empresa_id: empresaId },
          },
        },
        include: {
          historialCompras: {
            include: {
              pagos: true,
            },
          },
          valoraciones: true,
          empresas: {
            where: { empresa_id: empresaId },
          },
        },
      }),
      this.prisma.historialCompra.findMany({
        where: {
          cliente: {
            empresas: {
              some: { empresa_id: empresaId },
            },
          },
        },
        include: {
          pagos: true,
          cliente: true,
        },
      }),
      this.prisma.valoracion.findMany({
        where: {
          cliente: {
            empresas: {
              some: { empresa_id: empresaId },
            },
          },
        },
      }),
    ]);

    const totalClientes = clientes.length;
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 3); // Últimos 3 meses

    const clientesActivos = clientes.filter((cliente) =>
      cliente.historialCompras.some(
        (compra) => compra.fecha_compra >= fechaLimite,
      ),
    ).length;

    const fechaLimiteNuevos = new Date();
    fechaLimiteNuevos.setMonth(fechaLimiteNuevos.getMonth() - 1); // Último mes

    const clientesNuevos = clientes.filter(
      (cliente) => cliente.empresas[0]?.fecha_registro >= fechaLimiteNuevos,
    ).length;

    // Calcular CLV promedio
    const valoresTotales = clientes.map((cliente) => {
      const valorTotal = cliente.historialCompras.reduce((sum, compra) => {
        const valorCompra = compra.pagos.reduce(
          (sumPago, pago) => sumPago + Number(pago.monto),
          0,
        );
        return sum + valorCompra;
      }, 0);
      return valorTotal;
    });

    const valorVidaPromedio =
      valoresTotales.length > 0
        ? valoresTotales.reduce((sum, valor) => sum + valor, 0) /
          valoresTotales.length
        : 0;

    // Calcular frecuencia promedio
    const frecuencias = clientes.map(
      (cliente) => cliente.historialCompras.length,
    );
    const frecuenciaCompraPromedio =
      frecuencias.length > 0
        ? frecuencias.reduce((sum, freq) => sum + freq, 0) / frecuencias.length
        : 0;

    // Calcular tasas de retención y churn
    const clientesConComprasRecientes = clientes.filter((cliente) =>
      cliente.historialCompras.some(
        (compra) => compra.fecha_compra >= fechaLimite,
      ),
    ).length;

    const tasaRetencion =
      totalClientes > 0
        ? (clientesConComprasRecientes / totalClientes) * 100
        : 0;
    const tasaChurn = 100 - tasaRetencion;

    // Generar segmentación RFM simplificada
    const segmentacion = await this.generarSegmentacionClientes(clientes);

    // Top clientes
    const topClientes = clientes
      .map((cliente) => {
        const valorTotal = cliente.historialCompras.reduce((sum, compra) => {
          const valorCompra = compra.pagos.reduce(
            (sumPago, pago) => sumPago + Number(pago.monto),
            0,
          );
          return sum + valorCompra;
        }, 0);

        const ultimaCompra =
          cliente.historialCompras.length > 0
            ? cliente.historialCompras.sort(
                (a, b) => b.fecha_compra.getTime() - a.fecha_compra.getTime(),
              )[0].fecha_compra
            : new Date(0);

        // Score simplificado
        const recencia = Math.max(
          0,
          30 -
            Math.floor(
              (Date.now() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24),
            ),
        );
        const frecuencia = Math.min(100, cliente.historialCompras.length * 10);
        const valor = Math.min(100, valorTotal / 1000);
        const score = (recencia + frecuencia + valor) / 3;

        return {
          nombre: cliente.nombre,
          valorTotal,
          cantidadCompras: cliente.historialCompras.length,
          ultimaCompra,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Tendencias de comportamiento
    const tendenciasComportamiento =
      await this.calcularTendenciasComportamiento(empresaId);

    return {
      totalClientes,
      clientesActivos,
      clientesNuevos,
      tasaRetencion,
      tasaChurn,
      valorVidaPromedio,
      frecuenciaCompraPromedio,
      ingresosPorCliente: valorVidaPromedio,
      segmentacion,
      topClientes,
      tendenciasComportamiento,
    };
  }

  /**
   * Calcula el score RFM avanzado de un cliente
   */
  async calcularScoreCliente(
    empresaId: number,
    clienteId: number,
  ): Promise<IClienteScore> {
    this.logger.log(`Calculando score para cliente ${clienteId}`);

    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
      include: {
        historialCompras: {
          include: {
            pagos: true,
          },
          orderBy: {
            fecha_compra: 'desc',
          },
        },
        valoraciones: true,
        cotizaciones: true,
        consultas_whatsapp: true,
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Calcular factores RFM + Engagement + Lealtad
    const hoy = new Date();
    const ultimaCompra =
      cliente.historialCompras[0]?.fecha_compra || new Date(0);
    const diasSinComprar = Math.floor(
      (hoy.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Recencia (0-100, menor días = mayor score)
    const recencia = Math.max(0, 100 - Math.min(100, diasSinComprar / 3));

    // Frecuencia (0-100)
    const frecuencia = Math.min(100, cliente.historialCompras.length * 5);

    // Valor monetario (0-100)
    const valorTotal = cliente.historialCompras.reduce((sum, compra) => {
      const valorCompra = compra.pagos.reduce(
        (sumPago, pago) => sumPago + Number(pago.monto),
        0,
      );
      return sum + valorCompra;
    }, 0);
    const valor = Math.min(100, (valorTotal / 10000) * 100);

    // Engagement (valoraciones + consultas)
    const engagement = Math.min(
      100,
      cliente.valoraciones.length * 10 + cliente.consultas_whatsapp.length * 5,
    );

    // Lealtad (basada en tiempo como cliente y consistencia)
    const fechaRegistro = cliente.historialCompras[0]?.fecha_compra || hoy;
    const mesesCliente = Math.max(
      1,
      Math.floor(
        (hoy.getTime() - fechaRegistro.getTime()) / (1000 * 60 * 60 * 24 * 30),
      ),
    );
    const lealtad = Math.min(100, (frecuencia / mesesCliente) * 20);

    // Score ponderado
    const score =
      recencia * 0.25 +
      frecuencia * 0.25 +
      valor * 0.3 +
      engagement * 0.1 +
      lealtad * 0.1;

    // Determinar nivel
    let nivel: 'VIP' | 'PREMIUM' | 'REGULAR' | 'BASICO' | 'RIESGO';
    if (score >= 80) nivel = 'VIP';
    else if (score >= 65) nivel = 'PREMIUM';
    else if (score >= 45) nivel = 'REGULAR';
    else if (score >= 25) nivel = 'BASICO';
    else nivel = 'RIESGO';

    // Calcular probabilidad de churn
    const probabilidadChurn = Math.max(0, Math.min(100, 100 - score));

    // Estimar CLV
    const compraPromedio =
      valorTotal / Math.max(1, cliente.historialCompras.length);
    const frecuenciaAnual =
      (cliente.historialCompras.length / Math.max(1, mesesCliente)) * 12;
    const valorVidaEstimado = compraPromedio * frecuenciaAnual * 3; // 3 años estimados

    // Generar recomendaciones
    const recomendaciones = this.generarRecomendacionesCliente(
      { recencia, frecuencia, valor, engagement, lealtad },
      nivel,
    );

    // Próximas acciones
    const proximasAcciones = this.generarProximasAcciones(
      nivel,
      diasSinComprar,
      valorTotal,
    );

    return {
      clienteId,
      nombre: cliente.nombre,
      email: cliente.email,
      score,
      nivel,
      factores: {
        recencia,
        frecuencia,
        valor,
        engagement,
        lealtad,
      },
      recomendaciones,
      probabilidadChurn,
      valorVidaEstimado,
      proximasAcciones,
    };
  }

  /**
   * Analiza el customer journey de un cliente
   */
  async analizarCustomerJourney(
    empresaId: number,
    clienteId: number,
  ): Promise<ICustomerJourney> {
    this.logger.log(`Analizando customer journey para cliente ${clienteId}`);

    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
      include: {
        empresas: true,
        historialCompras: {
          orderBy: { fecha_compra: 'asc' },
        },
        cotizaciones: {
          orderBy: { fecha_emision: 'asc' },
        },
        consultas_whatsapp: {
          orderBy: { fecha_consulta: 'asc' },
        },
        valoraciones: {
          orderBy: { id_valoracion: 'asc' },
        },
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    const etapas: ICustomerJourney['etapas'] = [];

    // Primer contacto (registro)
    etapas.push({
      etapa: 'PRIMER_CONTACTO',
      fecha: cliente.empresas[0]?.fecha_registro || new Date(),
      descripcion: 'Cliente registrado en el sistema',
      canal: 'SISTEMA',
    });

    // Consultas (interés)
    cliente.consultas_whatsapp.forEach((consulta) => {
      etapas.push({
        etapa: 'INTERES',
        fecha: consulta.fecha_consulta,
        descripcion: `Consulta vía WhatsApp: ${consulta.mensaje.substring(0, 50)}...`,
        canal: 'WHATSAPP',
      });
    });

    // Cotizaciones (evaluación)
    cliente.cotizaciones.forEach((cotizacion) => {
      etapas.push({
        etapa: 'EVALUACION',
        fecha: cotizacion.fecha_emision,
        descripcion: `Cotización generada por S/ ${cotizacion.total}`,
        canal: 'VENTAS',
        valor: Number(cotizacion.total),
      });
    });

    // Compras
    cliente.historialCompras.forEach((compra) => {
      etapas.push({
        etapa: 'COMPRA',
        fecha: compra.fecha_compra,
        descripcion: 'Compra realizada',
        canal: 'VENTAS',
        valor: 0, // Se calculará con los pagos
      });
    });

    // Valoraciones (advocacy)
    cliente.valoraciones.forEach((valoracion) => {
      if (valoracion.puntuacion >= 4) {
        etapas.push({
          etapa: 'ADVOCACY',
          fecha: new Date(), // Las valoraciones no tienen fecha
          descripcion: `Valoración positiva: ${valoracion.puntuacion}/5`,
          canal: 'SISTEMA',
        });
      }
    });

    // Ordenar etapas por fecha
    etapas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    // Determinar etapa actual
    const ultimaCompra = cliente.historialCompras[0];
    const hoy = new Date();
    let etapaActual = 'PROSPECTO';

    if (cliente.historialCompras.length > 0) {
      const diasSinComprar = Math.floor(
        (hoy.getTime() - ultimaCompra.fecha_compra.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (diasSinComprar <= 30) {
        etapaActual = 'RETENCION';
      } else if (cliente.valoraciones.some((v) => v.puntuacion >= 4)) {
        etapaActual = 'ADVOCACY';
      } else {
        etapaActual = 'RETENCION';
      }
    } else if (cliente.cotizaciones.length > 0) {
      etapaActual = 'EVALUACION';
    } else if (cliente.consultas_whatsapp.length > 0) {
      etapaActual = 'INTERES';
    }

    const tiempoEnEtapaActual =
      etapas.length > 0
        ? Math.floor(
            (hoy.getTime() - etapas[etapas.length - 1].fecha.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

    // Calcular probabilidad de avance (simplificado)
    const probabilidadAvance = this.calcularProbabilidadAvance(
      etapaActual,
      cliente,
    );

    // Generar recomendaciones
    const accionesRecomendadas = this.generarAccionesJourney(
      etapaActual,
      tiempoEnEtapaActual,
    );
    const puntosCriticos = this.identificarPuntosCriticos(etapas);

    return {
      clienteId,
      etapas,
      etapaActual,
      tiempoEnEtapaActual,
      probabilidadAvance,
      accionesRecomendadas,
      puntosCriticos,
    };
  }

  /**
   * Analiza patrones de comportamiento
   */
  async analizarComportamientoCliente(
    empresaId: number,
    clienteId: number,
  ): Promise<IAnalisisComportamiento> {
    this.logger.log(`Analizando comportamiento para cliente ${clienteId}`);

    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
      include: {
        historialCompras: {
          include: {
            producto: {
              include: {
                categoria: true,
              },
            },
            pagos: true,
          },
        },
        consultas_whatsapp: true,
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Análisis de patrones de compra
    const compras = cliente.historialCompras;
    const horarios = compras.map((c) => c.fecha_compra.getHours());
    const dias = compras.map((c) => c.fecha_compra.getDay());

    const horarioPreferido = this.calcularHorarioPreferido(horarios);
    const diasPreferidos = this.calcularDiasPreferidos(dias);

    // Calcular frecuencia
    const fechas = compras
      .map((c) => c.fecha_compra)
      .sort((a, b) => a.getTime() - b.getTime());
    let frecuenciaPromedio = 0;
    if (fechas.length > 1) {
      const intervalos = [];
      for (let i = 1; i < fechas.length; i++) {
        intervalos.push(
          (fechas[i].getTime() - fechas[i - 1].getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }
      frecuenciaPromedio =
        intervalos.reduce((sum, i) => sum + i, 0) / intervalos.length;
    }

    // Análisis de estacionalidad (simplificado)
    const meses = compras.map((c) => c.fecha_compra.getMonth());
    const distribucionMeses = new Array(12).fill(0);
    meses.forEach((mes) => distribucionMeses[mes]++);
    const variacionMensual =
      Math.max(...distribucionMeses) - Math.min(...distribucionMeses);
    const estacionalidad = variacionMensual > 2;

    // Preferencias de productos
    const categorias = new Map<string, { count: number; total: number }>();
    compras.forEach((compra) => {
      const categoria = compra.producto.categoria.nombre;
      const valorCompra = compra.pagos.reduce(
        (sum, pago) => sum + Number(pago.monto),
        0,
      );

      if (!categorias.has(categoria)) {
        categorias.set(categoria, { count: 0, total: 0 });
      }

      const cat = categorias.get(categoria)!;
      cat.count++;
      cat.total += valorCompra;
    });

    const totalCompras = compras.length;
    const preferenciasProductos = Array.from(categorias.entries()).map(
      ([categoria, data]) => ({
        categoria,
        porcentajeCompras: (data.count / totalCompras) * 100,
        valorPromedio: data.total / data.count,
      }),
    );

    // Canales preferidos (simplificado)
    const canalesPreferidos = [
      {
        canal: 'WHATSAPP',
        utilizacion: cliente.consultas_whatsapp.length,
        conversion:
          cliente.consultas_whatsapp.length > 0
            ? (compras.length / cliente.consultas_whatsapp.length) * 100
            : 0,
      },
      {
        canal: 'DIRECTO',
        utilizacion: compras.length,
        conversion: 100,
      },
    ];

    // Sensibilidad al precio (basada en variación de montos)
    const montos = compras.map((c) =>
      c.pagos.reduce((sum, p) => sum + Number(p.monto), 0),
    );
    const promedioMonto = montos.reduce((sum, m) => sum + m, 0) / montos.length;
    const variacionPrecio =
      montos.length > 1
        ? Math.sqrt(
            montos.reduce((sum, m) => sum + Math.pow(m - promedioMonto, 2), 0) /
              montos.length,
          ) / promedioMonto
        : 0;

    let sensibilidadPrecio: 'ALTA' | 'MEDIA' | 'BAJA';
    if (variacionPrecio > 0.3) sensibilidadPrecio = 'ALTA';
    else if (variacionPrecio > 0.15) sensibilidadPrecio = 'MEDIA';
    else sensibilidadPrecio = 'BAJA';

    return {
      patronesCompra: {
        horarioPreferido,
        diasPreferidos,
        frecuenciaPromedio,
        estacionalidad,
      },
      preferenciasProductos,
      canalesPreferidos,
      sensibilidadPrecio,
      respuestaPromociones: {
        tasaRespuesta: 0, // Se podría calcular con datos de campañas
        tiposEfectivos: ['DESCUENTOS', 'OFERTAS_LIMITADAS'],
      },
    };
  }

  // Métodos auxiliares privados

  private async generarSegmentacionClientes(
    clientes: any[],
  ): Promise<IClienteSegmentacion[]> {
    // Implementación de segmentación RFM simplificada
    const segmentos = [
      {
        segmento: 'VIP',
        descripcion: 'Clientes de mayor valor con alta frecuencia de compra',
        cantidad: 0,
        porcentaje: 0,
        caracteristicas: ['Alta frecuencia', 'Alto valor', 'Compras recientes'],
        valorPromedio: 0,
        frecuenciaCompra: 0,
        tendencia: 'CRECIENTE' as const,
      },
      {
        segmento: 'PREMIUM',
        descripcion: 'Clientes leales con buen valor',
        cantidad: 0,
        porcentaje: 0,
        caracteristicas: ['Buena frecuencia', 'Valor medio-alto', 'Leales'],
        valorPromedio: 0,
        frecuenciaCompra: 0,
        tendencia: 'ESTABLE' as const,
      },
      {
        segmento: 'REGULARES',
        descripcion: 'Clientes ocasionales con potencial',
        cantidad: 0,
        porcentaje: 0,
        caracteristicas: [
          'Frecuencia media',
          'Valor medio',
          'Potencial crecimiento',
        ],
        valorPromedio: 0,
        frecuenciaCompra: 0,
        tendencia: 'ESTABLE' as const,
      },
      {
        segmento: 'EN_RIESGO',
        descripcion: 'Clientes que requieren atención para evitar churn',
        cantidad: 0,
        porcentaje: 0,
        caracteristicas: [
          'Baja frecuencia',
          'Sin compras recientes',
          'Riesgo de pérdida',
        ],
        valorPromedio: 0,
        frecuenciaCompra: 0,
        tendencia: 'DECRECIENTE' as const,
      },
    ];

    // Clasificar clientes (lógica simplificada)
    clientes.forEach((cliente) => {
      const valorTotal = cliente.historialCompras.reduce(
        (sum: number, compra: any) => {
          const valorCompra = compra.pagos.reduce(
            (sumPago: number, pago: any) => sumPago + Number(pago.monto),
            0,
          );
          return sum + valorCompra;
        },
        0,
      );

      const ultimaCompra =
        cliente.historialCompras[0]?.fecha_compra || new Date(0);
      const diasSinComprar = Math.floor(
        (Date.now() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24),
      );
      const frecuencia = cliente.historialCompras.length;

      if (valorTotal > 10000 && frecuencia >= 5 && diasSinComprar <= 30) {
        segmentos[0].cantidad++;
        segmentos[0].valorPromedio += valorTotal;
        segmentos[0].frecuenciaCompra += frecuencia;
      } else if (valorTotal > 5000 && frecuencia >= 3 && diasSinComprar <= 60) {
        segmentos[1].cantidad++;
        segmentos[1].valorPromedio += valorTotal;
        segmentos[1].frecuenciaCompra += frecuencia;
      } else if (frecuencia >= 1 && diasSinComprar <= 90) {
        segmentos[2].cantidad++;
        segmentos[2].valorPromedio += valorTotal;
        segmentos[2].frecuenciaCompra += frecuencia;
      } else {
        segmentos[3].cantidad++;
        segmentos[3].valorPromedio += valorTotal;
        segmentos[3].frecuenciaCompra += frecuencia;
      }
    });

    // Calcular promedios y porcentajes
    const totalClientes = clientes.length;
    segmentos.forEach((segmento) => {
      segmento.porcentaje =
        totalClientes > 0 ? (segmento.cantidad / totalClientes) * 100 : 0;
      segmento.valorPromedio =
        segmento.cantidad > 0 ? segmento.valorPromedio / segmento.cantidad : 0;
      segmento.frecuenciaCompra =
        segmento.cantidad > 0
          ? segmento.frecuenciaCompra / segmento.cantidad
          : 0;
    });

    return segmentos;
  }

  private async calcularTendenciasComportamiento(empresaId: number) {
    // Calcular crecimiento mensual de clientes
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [clientesMesAnterior, clientesMesActual] = await Promise.all([
      this.prisma.clienteEmpresa.count({
        where: {
          empresa_id: empresaId,
          fecha_registro: {
            gte: mesAnterior,
            lt: mesActual,
          },
        },
      }),
      this.prisma.clienteEmpresa.count({
        where: {
          empresa_id: empresaId,
          fecha_registro: {
            gte: mesActual,
          },
        },
      }),
    ]);

    const crecimientoMensual =
      clientesMesAnterior > 0
        ? ((clientesMesActual - clientesMesAnterior) / clientesMesAnterior) *
          100
        : 0;

    // Estacionalidad (últimos 12 meses)
    const estacionalidad = [];
    for (let i = 11; i >= 0; i--) {
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1);

      const actividad = await this.prisma.historialCompra.count({
        where: {
          fecha_compra: {
            gte: fechaInicio,
            lt: fechaFin,
          },
          cliente: {
            empresas: {
              some: { empresa_id: empresaId },
            },
          },
        },
      });

      estacionalidad.push({
        mes: fechaInicio.getMonth() + 1,
        actividad,
      });
    }

    return {
      crecimientoMensual,
      estacionalidad,
      patronesCompra: [
        'Mayor actividad en horarios laborales',
        'Picos de compra los fines de semana',
        'Estacionalidad en fechas festivas',
      ],
    };
  }

  private generarRecomendacionesCliente(
    factores: any,
    nivel: string,
  ): string[] {
    const recomendaciones = [];

    if (factores.recencia < 30) {
      recomendaciones.push(
        'Contactar al cliente para reactivar relación comercial',
      );
    }

    if (factores.frecuencia < 20) {
      recomendaciones.push('Implementar programa de fidelización');
    }

    if (factores.valor < 40) {
      recomendaciones.push('Ofrecer productos de mayor valor');
    }

    if (factores.engagement < 30) {
      recomendaciones.push(
        'Aumentar interacción mediante contenido personalizado',
      );
    }

    if (nivel === 'VIP') {
      recomendaciones.push('Mantener atención personalizada y exclusiva');
    } else if (nivel === 'RIESGO') {
      recomendaciones.push('Campaña de retención urgente');
    }

    return recomendaciones;
  }

  private generarProximasAcciones(
    nivel: string,
    diasSinComprar: number,
    valorTotal: number,
  ) {
    const acciones = [];

    if (diasSinComprar > 60) {
      acciones.push({
        accion: 'Campaña de reactivación personalizada',
        prioridad: 'ALTA' as const,
        fechaSugerida: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
      });
    }

    if (nivel === 'VIP' || valorTotal > 10000) {
      acciones.push({
        accion: 'Llamada de seguimiento personalizada',
        prioridad: 'ALTA' as const,
        fechaSugerida: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // En 3 días
      });
    }

    acciones.push({
      accion: 'Envío de newsletter con ofertas personalizadas',
      prioridad: 'MEDIA' as const,
      fechaSugerida: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // En una semana
    });

    return acciones;
  }

  private calcularProbabilidadAvance(
    etapaActual: string,
    cliente: any,
  ): number {
    // Lógica simplificada para calcular probabilidad de avance
    const historialCompras = cliente.historialCompras.length;
    const consultas = cliente.consultas_whatsapp.length;
    const cotizaciones = cliente.cotizaciones.length;

    switch (etapaActual) {
      case 'PROSPECTO':
        return consultas > 0 ? 70 : 30;
      case 'INTERES':
        return cotizaciones > 0 ? 60 : 40;
      case 'EVALUACION':
        return historialCompras > 0 ? 80 : 50;
      case 'COMPRA':
        return historialCompras > 1 ? 85 : 60;
      case 'RETENCION':
        return historialCompras > 3 ? 90 : 70;
      default:
        return 50;
    }
  }

  private generarAccionesJourney(
    etapaActual: string,
    tiempoEnEtapa: number,
  ): string[] {
    const acciones = [];

    switch (etapaActual) {
      case 'PROSPECTO':
        acciones.push('Enviar contenido de bienvenida');
        acciones.push('Agendar llamada de presentación');
        break;
      case 'INTERES':
        acciones.push('Enviar información detallada de productos');
        acciones.push('Ofrecer demo o prueba gratuita');
        break;
      case 'EVALUACION':
        if (tiempoEnEtapa > 15) {
          acciones.push('Seguimiento urgente de cotización');
        }
        acciones.push('Ofrecer descuento especial');
        break;
      case 'RETENCION':
        acciones.push('Programa de fidelización');
        acciones.push('Encuesta de satisfacción');
        break;
    }

    return acciones;
  }

  private identificarPuntosCriticos(
    etapas: ICustomerJourney['etapas'],
  ): string[] {
    const puntosCriticos = [];

    // Analizar tiempo entre etapas
    for (let i = 1; i < etapas.length; i++) {
      const tiempoTransicion =
        (etapas[i].fecha.getTime() - etapas[i - 1].fecha.getTime()) /
        (1000 * 60 * 60 * 24);

      if (tiempoTransicion > 30) {
        puntosCriticos.push(
          `Transición lenta entre ${etapas[i - 1].etapa} y ${etapas[i].etapa} (${Math.floor(tiempoTransicion)} días)`,
        );
      }
    }

    // Verificar patrones problemáticos
    const ultimaEtapa = etapas[etapas.length - 1];
    const diasDesdeUltimaActividad = Math.floor(
      (Date.now() - ultimaEtapa.fecha.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasDesdeUltimaActividad > 60) {
      puntosCriticos.push(
        `Sin actividad por ${diasDesdeUltimaActividad} días - Riesgo de churn`,
      );
    }

    return puntosCriticos;
  }

  private calcularHorarioPreferido(horarios: number[]): string {
    if (horarios.length === 0) return 'No definido';

    const frecuencias = new Array(24).fill(0);
    horarios.forEach((hora) => frecuencias[hora]++);

    const horaMasFrequente = frecuencias.indexOf(Math.max(...frecuencias));

    if (horaMasFrequente >= 6 && horaMasFrequente <= 12) return 'Mañana';
    if (horaMasFrequente >= 13 && horaMasFrequente <= 18) return 'Tarde';
    if (horaMasFrequente >= 19 && horaMasFrequente <= 23) return 'Noche';
    return 'Madrugada';
  }

  private calcularDiasPreferidos(dias: number[]): string[] {
    if (dias.length === 0) return ['No definido'];

    const nombresDias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const frecuencias = new Array(7).fill(0);
    dias.forEach((dia) => frecuencias[dia]++);

    const maxFrecuencia = Math.max(...frecuencias);
    const diasPreferidos = frecuencias
      .map((freq, index) => ({ dia: nombresDias[index], freq }))
      .filter((item) => item.freq === maxFrecuencia)
      .map((item) => item.dia);

    return diasPreferidos;
  }
}
