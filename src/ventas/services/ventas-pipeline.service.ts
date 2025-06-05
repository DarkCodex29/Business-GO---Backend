import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Interfaces para el pipeline de ventas
export interface IConversionRequest {
  documentoId: number;
  empresaId: number;
  notas?: string;
  fechaProgramada?: Date;
}

export interface IConversionResult {
  success: boolean;
  documentoOrigen: any;
  documentoDestino: any;
  mensaje: string;
  datos?: any;
}

export interface IPipelineStats {
  cotizacionesPendientes: number;
  cotizacionesAceptadas: number;
  ordenesPendientes: number;
  ordenesEnProceso: number;
  facturasEmitidas: number;
  tasaConversionCotizacion: number;
  tasaConversionOrden: number;
  tiempoPromedioConversion: number;
}

export interface IFunnelAnalysis {
  etapa: string;
  cantidad: number;
  monto: number;
  porcentajePerdida: number;
  tiempoPromedio: number;
}

@Injectable()
export class VentasPipelineService {
  private readonly logger = new Logger(VentasPipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convierte una cotización a orden de venta
   */
  async convertirCotizacionAOrden(
    request: IConversionRequest,
  ): Promise<IConversionResult> {
    const { documentoId, empresaId, notas, fechaProgramada } = request;

    try {
      // Validar cotización
      const cotizacion = await this.prisma.cotizacion.findFirst({
        where: {
          id_cotizacion: documentoId,
          id_empresa: empresaId,
          estado: 'ACEPTADA',
        },
        include: {
          items: {
            include: {
              producto: true,
            },
          },
          cliente: true,
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(
          'Cotización no encontrada o no está en estado ACEPTADA',
        );
      }

      // Verificar que no esté ya convertida
      const ordenExistente = await this.prisma.ordenVenta.findFirst({
        where: { id_cotizacion: documentoId },
      });

      if (ordenExistente) {
        throw new BadRequestException(
          'La cotización ya ha sido convertida a orden de venta',
        );
      }

      // Crear orden de venta en transacción
      const resultado = await this.prisma.$transaction(async (tx) => {
        // Crear orden de venta
        const ordenVenta = await tx.ordenVenta.create({
          data: {
            id_cotizacion: cotizacion.id_cotizacion,
            id_empresa: empresaId,
            id_cliente: cotizacion.id_cliente,
            fecha_emision: new Date(),
            fecha_entrega:
              fechaProgramada || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días por defecto
            subtotal: cotizacion.subtotal,
            descuento: cotizacion.descuento,
            igv: cotizacion.igv,
            total: cotizacion.total,
            estado: 'PENDIENTE',
            notas: notas || cotizacion.notas,
          },
        });

        // Crear items de la orden
        for (const item of cotizacion.items) {
          await tx.itemOrdenVenta.create({
            data: {
              id_orden_venta: ordenVenta.id_orden_venta,
              id_producto: item.id_producto,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              descuento: item.descuento,
              subtotal: item.subtotal,
            },
          });
        }

        // Actualizar estado de cotización
        await tx.cotizacion.update({
          where: { id_cotizacion: documentoId },
          data: { estado: 'CONVERTIDA' },
        });

        return ordenVenta;
      });

      this.logger.log(
        `Cotización ${documentoId} convertida a orden de venta ${resultado.id_orden_venta}`,
      );

      return {
        success: true,
        documentoOrigen: cotizacion,
        documentoDestino: resultado,
        mensaje: 'Cotización convertida a orden de venta exitosamente',
        datos: { ordenVentaId: resultado.id_orden_venta },
      };
    } catch (error) {
      this.logger.error(
        `Error convirtiendo cotización ${documentoId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Convierte una orden de venta a factura
   */
  async convertirOrdenAFactura(
    request: IConversionRequest,
  ): Promise<IConversionResult> {
    const { documentoId, empresaId, notas } = request;

    try {
      // Validar orden de venta
      const ordenVenta = await this.prisma.ordenVenta.findFirst({
        where: {
          id_orden_venta: documentoId,
          id_empresa: empresaId,
          estado: { in: ['CONFIRMADA', 'EN_PROCESO', 'ENVIADA'] },
        },
        include: {
          items: {
            include: {
              producto: true,
            },
          },
          cliente: true,
        },
      });

      if (!ordenVenta) {
        throw new NotFoundException(
          'Orden de venta no encontrada o no está en estado válido para facturación',
        );
      }

      // Verificar que no esté ya facturada
      const facturaExistente = await this.prisma.factura.findFirst({
        where: { id_orden_venta: documentoId },
      });

      if (facturaExistente) {
        throw new BadRequestException('La orden de venta ya ha sido facturada');
      }

      // Generar número de factura
      const ultimaFactura = await this.prisma.factura.findFirst({
        where: {
          orden_venta: { id_empresa: empresaId },
        },
        orderBy: { id_factura: 'desc' },
      });

      const numeroFactura = this.generarNumeroFactura(
        ultimaFactura?.numero_factura,
      );

      // Crear factura en transacción
      const resultado = await this.prisma.$transaction(async (tx) => {
        // Crear factura
        const factura = await tx.factura.create({
          data: {
            id_orden_venta: ordenVenta.id_orden_venta,
            numero_factura: numeroFactura,
            fecha_emision: new Date(),
            subtotal: ordenVenta.subtotal,
            descuento: ordenVenta.descuento,
            igv: ordenVenta.igv,
            total: ordenVenta.total,
            estado: 'EMITIDA',
            notas: notas || ordenVenta.notas,
          },
        });

        // Actualizar estado de orden
        await tx.ordenVenta.update({
          where: { id_orden_venta: documentoId },
          data: { estado: 'FACTURADA' },
        });

        return factura;
      });

      this.logger.log(
        `Orden de venta ${documentoId} convertida a factura ${resultado.id_factura}`,
      );

      return {
        success: true,
        documentoOrigen: ordenVenta,
        documentoDestino: resultado,
        mensaje: 'Orden de venta convertida a factura exitosamente',
        datos: { facturaId: resultado.id_factura, numeroFactura },
      };
    } catch (error) {
      this.logger.error(
        `Error convirtiendo orden ${documentoId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Proceso automático completo: Cotización → Orden → Factura
   */
  async procesoCompletoVenta(
    cotizacionId: number,
    empresaId: number,
    options: {
      notas?: string;
      fechaEntrega?: Date;
      autofacturar?: boolean;
    } = {},
  ): Promise<{
    cotizacion: any;
    ordenVenta: any;
    factura?: any;
    pasos: string[];
  }> {
    const pasos: string[] = [];

    try {
      // Paso 1: Convertir cotización a orden
      const conversionOrden = await this.convertirCotizacionAOrden({
        documentoId: cotizacionId,
        empresaId,
        notas: options.notas,
        fechaProgramada: options.fechaEntrega,
      });

      pasos.push('Cotización convertida a orden de venta');

      let facturaResult: IConversionResult | null = null;

      // Paso 2: Auto-facturar si está habilitado
      if (options.autofacturar) {
        facturaResult = await this.convertirOrdenAFactura({
          documentoId: conversionOrden.datos.ordenVentaId,
          empresaId,
          notas: options.notas,
        });
        pasos.push('Orden de venta convertida a factura');
      }

      return {
        cotizacion: conversionOrden.documentoOrigen,
        ordenVenta: conversionOrden.documentoDestino,
        factura: facturaResult?.documentoDestino,
        pasos,
      };
    } catch (error) {
      this.logger.error(`Error en proceso completo de venta: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del pipeline de ventas
   */
  async obtenerEstadisticasPipeline(
    empresaId: number,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<IPipelineStats> {
    const whereClause = {
      id_empresa: empresaId,
      ...(fechaDesde || fechaHasta
        ? {
            fecha_emision: {
              ...(fechaDesde && { gte: fechaDesde }),
              ...(fechaHasta && { lte: fechaHasta }),
            },
          }
        : {}),
    };

    const [
      cotizacionesPendientes,
      cotizacionesAceptadas,
      ordenesPendientes,
      ordenesEnProceso,
      facturasEmitidas,
      totalCotizaciones,
      totalOrdenes,
    ] = await Promise.all([
      this.prisma.cotizacion.count({
        where: { ...whereClause, estado: 'PENDIENTE' },
      }),
      this.prisma.cotizacion.count({
        where: { ...whereClause, estado: 'ACEPTADA' },
      }),
      this.prisma.ordenVenta.count({
        where: { ...whereClause, estado: 'PENDIENTE' },
      }),
      this.prisma.ordenVenta.count({
        where: { ...whereClause, estado: { in: ['CONFIRMADA', 'EN_PROCESO'] } },
      }),
      this.prisma.factura.count({
        where: {
          orden_venta: whereClause,
          estado: 'EMITIDA',
        },
      }),
      this.prisma.cotizacion.count({ where: whereClause }),
      this.prisma.ordenVenta.count({ where: whereClause }),
    ]);

    const tasaConversionCotizacion =
      totalCotizaciones > 0
        ? (cotizacionesAceptadas / totalCotizaciones) * 100
        : 0;

    const tasaConversionOrden =
      totalOrdenes > 0 ? (facturasEmitidas / totalOrdenes) * 100 : 0;

    // Calcular tiempo promedio de conversión (simplificado)
    const tiempoPromedioConversion =
      await this.calcularTiempoPromedioConversion(empresaId);

    return {
      cotizacionesPendientes,
      cotizacionesAceptadas,
      ordenesPendientes,
      ordenesEnProceso,
      facturasEmitidas,
      tasaConversionCotizacion: Number(tasaConversionCotizacion.toFixed(2)),
      tasaConversionOrden: Number(tasaConversionOrden.toFixed(2)),
      tiempoPromedioConversion,
    };
  }

  /**
   * Análisis del embudo de ventas (funnel)
   */
  async analizarEmbudoVentas(
    empresaId: number,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<IFunnelAnalysis[]> {
    const whereClause = {
      id_empresa: empresaId,
      ...(fechaDesde || fechaHasta
        ? {
            fecha_emision: {
              ...(fechaDesde && { gte: fechaDesde }),
              ...(fechaHasta && { lte: fechaHasta }),
            },
          }
        : {}),
    };

    const [cotizaciones, ordenes, facturas] = await Promise.all([
      this.prisma.cotizacion.findMany({
        where: whereClause,
        select: {
          id_cotizacion: true,
          total: true,
          fecha_emision: true,
          estado: true,
        },
      }),
      this.prisma.ordenVenta.findMany({
        where: whereClause,
        select: {
          id_orden_venta: true,
          total: true,
          fecha_emision: true,
          estado: true,
        },
      }),
      this.prisma.factura.findMany({
        where: {
          orden_venta: whereClause,
        },
        select: {
          id_factura: true,
          total: true,
          fecha_emision: true,
          estado: true,
        },
      }),
    ]);

    const totalCotizaciones = cotizaciones.length;
    const totalOrdenes = ordenes.length;
    const totalFacturas = facturas.length;

    const montoCotizaciones = cotizaciones.reduce(
      (sum, c) => sum + Number(c.total),
      0,
    );
    const montoOrdenes = ordenes.reduce((sum, o) => sum + Number(o.total), 0);
    const montoFacturas = facturas.reduce((sum, f) => sum + Number(f.total), 0);

    return [
      {
        etapa: 'Cotizaciones',
        cantidad: totalCotizaciones,
        monto: montoCotizaciones,
        porcentajePerdida: 0,
        tiempoPromedio: 0,
      },
      {
        etapa: 'Órdenes de Venta',
        cantidad: totalOrdenes,
        monto: montoOrdenes,
        porcentajePerdida:
          totalCotizaciones > 0
            ? ((totalCotizaciones - totalOrdenes) / totalCotizaciones) * 100
            : 0,
        tiempoPromedio: 2.5, // días promedio
      },
      {
        etapa: 'Facturas',
        cantidad: totalFacturas,
        monto: montoFacturas,
        porcentajePerdida:
          totalOrdenes > 0
            ? ((totalOrdenes - totalFacturas) / totalOrdenes) * 100
            : 0,
        tiempoPromedio: 5.8, // días promedio
      },
    ];
  }

  /**
   * Identifica cuellos de botella en el pipeline
   */
  async identificarCuellosBottella(empresaId: number): Promise<{
    alertas: string[];
    recomendaciones: string[];
    metricas: any;
  }> {
    const stats = await this.obtenerEstadisticasPipeline(empresaId);
    const alertas: string[] = [];
    const recomendaciones: string[] = [];

    // Analizar cuellos de botella
    if (stats.tasaConversionCotizacion < 30) {
      alertas.push('Baja tasa de conversión de cotizaciones (< 30%)');
      recomendaciones.push(
        'Revisar proceso de seguimiento de cotizaciones y estrategia de precios',
      );
    }

    if (stats.tasaConversionOrden < 70) {
      alertas.push('Baja tasa de conversión de órdenes a facturas (< 70%)');
      recomendaciones.push(
        'Optimizar proceso de facturación y flujo de entrega',
      );
    }

    if (stats.tiempoPromedioConversion > 15) {
      alertas.push('Tiempo de conversión muy alto (> 15 días)');
      recomendaciones.push(
        'Implementar automatización y reducir pasos manuales',
      );
    }

    if (stats.cotizacionesPendientes > stats.cotizacionesAceptadas * 2) {
      alertas.push('Acumulación excesiva de cotizaciones pendientes');
      recomendaciones.push(
        'Intensificar seguimiento comercial y gestión de leads',
      );
    }

    return {
      alertas,
      recomendaciones,
      metricas: stats,
    };
  }

  // Métodos auxiliares privados

  private generarNumeroFactura(ultimoNumero?: string): string {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');

    if (!ultimoNumero) {
      return `F${año}${mes}-0001`;
    }

    // Extraer número secuencial del último número
    const match = ultimoNumero.match(/-(\d+)$/);
    const ultimoSecuencial = match ? parseInt(match[1]) : 0;
    const nuevoSecuencial = String(ultimoSecuencial + 1).padStart(4, '0');

    return `F${año}${mes}-${nuevoSecuencial}`;
  }

  private async calcularTiempoPromedioConversion(
    empresaId: number,
  ): Promise<number> {
    // Implementación simplificada - en producción se haría con análisis más detallado
    const facturasRecientes = await this.prisma.factura.findMany({
      where: {
        orden_venta: { id_empresa: empresaId },
        fecha_emision: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        },
      },
      include: {
        orden_venta: {
          include: {
            cotizacion: true,
          },
        },
      },
      take: 50,
    });

    if (facturasRecientes.length === 0) return 0;

    const tiempos = facturasRecientes
      .filter((f) => f.orden_venta?.cotizacion)
      .map((f) => {
        const fechaCotizacion = f.orden_venta.cotizacion?.fecha_emision;
        const fechaFactura = f.fecha_emision;
        if (!fechaCotizacion) return 0;
        return (
          (fechaFactura.getTime() - fechaCotizacion.getTime()) /
          (1000 * 60 * 60 * 24)
        );
      });

    return tiempos.length > 0
      ? Number((tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(1))
      : 0;
  }
}
