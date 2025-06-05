import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Interfaces para pipeline de compras
export interface IConversionRequestCompras {
  documentoId: number;
  empresaId: number;
  notas?: string;
  fechaProgramada?: Date;
  proveedorId?: number;
  aprobacionAutomatica?: boolean;
}

export interface IConversionResultCompras {
  exito: boolean;
  documentoOrigen: any;
  documentoDestino: any;
  datos: {
    documentoId: number;
    numeroDocumento?: string;
    total: number;
    estado: string;
  };
  mensaje: string;
  fechaConversion: Date;
}

export interface IPipelineStatsCompras {
  totalSolicitudes: number;
  totalCotizaciones: number;
  totalOrdenes: number;
  totalRecibidas: number;
  solicitudesPendientes: number;
  cotizacionesEnEvaluacion: number;
  ordenesPendientes: number;
  ordenesEnTransito: number;
  tasaConversionSolicitud: number;
  tasaConversionCotizacion: number;
  tasaRecepcion: number;
  tiempoPromedioGestion: number;
  valorTotalPipeline: number;
  valorOrdenesPendientes: number;
}

export interface IFunnelAnalysisCompras {
  etapa: string;
  cantidad: number;
  monto: number;
  porcentajePerdida: number;
  tiempoPromedio: number;
  proveedoresActivos: number;
}

export interface IAhorroPotencial {
  categoria: string;
  proveedorActual: string;
  proveedorAlternativo: string;
  precioActual: number;
  precioAlternativo: number;
  ahorroUnitario: number;
  volumenAnual: number;
  ahorroAnualPotencial: number;
  porcentajeAhorro: number;
}

@Injectable()
export class ComprasPipelineService {
  private readonly logger = new Logger(ComprasPipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convierte una cotización de proveedor en orden de compra
   */
  async convertirCotizacionAOrden(
    request: IConversionRequestCompras,
  ): Promise<IConversionResultCompras> {
    const {
      documentoId,
      empresaId,
      notas,
      fechaProgramada,
      aprobacionAutomatica,
    } = request;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Obtener cotización del proveedor
        const cotizacion = await tx.cotizacionProveedor.findFirst({
          where: {
            id_cotizacion_proveedor: documentoId,
            proveedor: {
              empresa_id: empresaId,
            },
            estado: 'pendiente',
          },
          include: {
            items: {
              include: {
                producto: true,
              },
            },
            proveedor: true,
          },
        });

        if (!cotizacion) {
          throw new NotFoundException(
            'Cotización de proveedor no encontrada o no válida',
          );
        }

        // Validaciones de negocio
        if (Number(cotizacion.total) <= 0) {
          throw new Error('El monto de la cotización debe ser mayor a cero');
        }

        const fechaEntrega =
          fechaProgramada || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 días por defecto

        // Generar número de orden automático
        const ultimaOrden = await tx.ordenCompra.findFirst({
          where: { id_empresa: empresaId },
          orderBy: { numero_orden: 'desc' },
        });

        const numeroOrden = this.generarNumeroOrden(ultimaOrden?.numero_orden);

        // Crear orden de compra
        const ordenCompra = await tx.ordenCompra.create({
          data: {
            numero_orden: numeroOrden,
            id_empresa: empresaId,
            id_proveedor: cotizacion.id_proveedor,
            fecha_emision: new Date(),
            fecha_entrega: fechaEntrega,
            subtotal: cotizacion.subtotal,
            igv: cotizacion.igv,
            total: cotizacion.total,
            estado: aprobacionAutomatica ? 'aprobada' : 'pendiente',
            notas:
              notas ||
              `Generada desde cotización ${cotizacion.id_cotizacion_proveedor}`,
            items: {
              create: cotizacion.items.map((item) => ({
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal: item.subtotal,
                estado: 'pendiente',
              })),
            },
          },
          include: {
            items: true,
            proveedor: true,
          },
        });

        // Actualizar estado de la cotización
        await tx.cotizacionProveedor.update({
          where: { id_cotizacion_proveedor: documentoId },
          data: { estado: 'aprobada' },
        });

        this.logger.log(
          `Cotización ${documentoId} convertida a orden de compra ${ordenCompra.id_orden_compra}`,
        );

        return {
          exito: true,
          documentoOrigen: cotizacion,
          documentoDestino: ordenCompra,
          datos: {
            documentoId: ordenCompra.id_orden_compra,
            numeroDocumento: ordenCompra.numero_orden,
            total: Number(ordenCompra.total),
            estado: ordenCompra.estado,
          },
          mensaje: `Orden de compra ${numeroOrden} creada exitosamente`,
          fechaConversion: new Date(),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error convirtiendo cotización a orden: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Marca una orden de compra como recibida
   */
  async marcarOrdenRecibida(
    request: IConversionRequestCompras & {
      cantidadesRecibidas?: { [productoId: number]: number };
      fechaRecepcion?: Date;
    },
  ): Promise<IConversionResultCompras> {
    const {
      documentoId,
      empresaId,
      notas,
      cantidadesRecibidas,
      fechaRecepcion,
    } = request;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const ordenCompra = await tx.ordenCompra.findFirst({
          where: {
            id_orden_compra: documentoId,
            id_empresa: empresaId,
            estado: { in: ['aprobada', 'en_transito'] },
          },
          include: {
            items: {
              include: {
                producto: true,
              },
            },
            proveedor: true,
          },
        });

        if (!ordenCompra) {
          throw new NotFoundException(
            'Orden de compra no encontrada o no válida para recepción',
          );
        }

        // Actualizar stock de productos (si el módulo de inventario está disponible)
        for (const item of ordenCompra.items) {
          const cantidadRecibida =
            cantidadesRecibidas?.[item.id_producto] || item.cantidad;

          // Actualizar stock en inventario
          try {
            // Simplificado: buscar stock existente y actualizar o crear
            const stockExistente = await tx.stock.findFirst({
              where: { id_producto: item.id_producto },
            });

            if (stockExistente) {
              await tx.stock.update({
                where: { id_stock: stockExistente.id_stock },
                data: {
                  cantidad: { increment: cantidadRecibida },
                },
              });
            } else {
              await tx.stock.create({
                data: {
                  id_producto: item.id_producto,
                  cantidad: cantidadRecibida,
                },
              });
            }

            // Actualizar estado del item
            await tx.itemOrdenCompra.updateMany({
              where: {
                id_orden_compra: documentoId,
                id_producto: item.id_producto,
              },
              data: {
                estado: 'recibido',
              },
            });
          } catch (stockError) {
            this.logger.warn(
              `Error actualizando stock para producto ${item.id_producto}: ${stockError.message}`,
            );
          }
        }

        // Actualizar orden de compra
        const ordenActualizada = await tx.ordenCompra.update({
          where: { id_orden_compra: documentoId },
          data: {
            estado: 'recibida',
            notas: notas
              ? `${ordenCompra.notas || ''}\n${notas}`
              : ordenCompra.notas,
          },
          include: {
            items: true,
            proveedor: true,
          },
        });

        this.logger.log(`Orden de compra ${documentoId} marcada como recibida`);

        return {
          exito: true,
          documentoOrigen: ordenCompra,
          documentoDestino: ordenActualizada,
          datos: {
            documentoId: ordenActualizada.id_orden_compra,
            numeroDocumento: ordenActualizada.numero_orden,
            total: Number(ordenActualizada.total),
            estado: ordenActualizada.estado,
          },
          mensaje: `Orden de compra ${ordenActualizada.numero_orden} recibida exitosamente`,
          fechaConversion: fechaRecepcion || new Date(),
        };
      });
    } catch (error) {
      this.logger.error(`Error marcando orden como recibida: ${error.message}`);
      throw error;
    }
  }

  /**
   * Proceso automático completo: Cotización → Orden → Recepción
   */
  async procesoCompletoCompra(
    cotizacionId: number,
    empresaId: number,
    options: {
      notas?: string;
      fechaEntrega?: Date;
      autoReceptor?: boolean;
      cantidadesRecibidas?: { [productoId: number]: number };
    } = {},
  ): Promise<{
    cotizacion: any;
    ordenCompra: any;
    recepcion?: any;
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
        aprobacionAutomatica: true,
      });

      pasos.push('Cotización convertida a orden de compra');

      let recepcionResult: IConversionResultCompras | null = null;

      // Paso 2: Auto-recibir si está habilitado (solo para testing o casos especiales)
      if (options.autoReceptor) {
        recepcionResult = await this.marcarOrdenRecibida({
          documentoId: conversionOrden.datos.documentoId,
          empresaId,
          notas: 'Recepción automática del sistema',
          cantidadesRecibidas: options.cantidadesRecibidas,
        });
        pasos.push('Orden de compra marcada como recibida automáticamente');
      }

      return {
        cotizacion: conversionOrden.documentoOrigen,
        ordenCompra: conversionOrden.documentoDestino,
        recepcion: recepcionResult?.documentoDestino,
        pasos,
      };
    } catch (error) {
      this.logger.error(
        `Error en proceso completo de compra: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del pipeline de compras
   */
  async obtenerEstadisticasPipeline(
    empresaId: number,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<IPipelineStatsCompras> {
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

    const [cotizaciones, ordenes, ordenesPendientes, ordenesTransito] =
      await Promise.all([
        this.prisma.cotizacionProveedor.findMany({
          where: {
            proveedor: {
              empresa_id: empresaId,
            },
            ...(fechaDesde || fechaHasta
              ? {
                  fecha_emision: {
                    ...(fechaDesde && { gte: fechaDesde }),
                    ...(fechaHasta && { lte: fechaHasta }),
                  },
                }
              : {}),
          },
          select: {
            id_cotizacion_proveedor: true,
            total: true,
            estado: true,
            fecha_emision: true,
          },
        }),
        this.prisma.ordenCompra.findMany({
          where: whereClause,
          select: {
            id_orden_compra: true,
            total: true,
            estado: true,
            fecha_emision: true,
          },
        }),
        this.prisma.ordenCompra.count({
          where: { ...whereClause, estado: 'pendiente' },
        }),
        this.prisma.ordenCompra.count({
          where: { ...whereClause, estado: 'en_transito' },
        }),
      ]);

    const totalCotizaciones = cotizaciones.length;
    const totalOrdenes = ordenes.length;
    const totalRecibidas = ordenes.filter(
      (o) => o.estado === 'RECIBIDA',
    ).length;

    const valorTotal = ordenes.reduce((sum, o) => sum + Number(o.total), 0);
    const valorPendientes = ordenes
      .filter((o) => ['pendiente', 'en_transito'].includes(o.estado))
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Calcular tiempo promedio de gestión
    const tiemposGestion = ordenes
      .filter((o) => o.estado === 'recibida')
      .map((o) => {
        const cotizacionRelacionada = cotizaciones.find(
          (c) =>
            Math.abs(c.fecha_emision.getTime() - o.fecha_emision.getTime()) <
            24 * 60 * 60 * 1000 * 7, // 7 días de diferencia
        );
        if (cotizacionRelacionada) {
          return (
            (o.fecha_emision.getTime() -
              cotizacionRelacionada.fecha_emision.getTime()) /
            (1000 * 60 * 60 * 24)
          );
        }
        return 0;
      })
      .filter((t) => t > 0);

    const tiempoPromedioGestion =
      tiemposGestion.length > 0
        ? tiemposGestion.reduce((sum, t) => sum + t, 0) / tiemposGestion.length
        : 0;

    return {
      totalSolicitudes: totalCotizaciones + totalOrdenes,
      totalCotizaciones,
      totalOrdenes,
      totalRecibidas,
      solicitudesPendientes: cotizaciones.filter(
        (c) => c.estado === 'pendiente',
      ).length,
      cotizacionesEnEvaluacion: cotizaciones.filter(
        (c) => c.estado === 'en_evaluacion',
      ).length,
      ordenesPendientes,
      ordenesEnTransito: ordenesTransito,
      tasaConversionSolicitud:
        totalCotizaciones > 0 ? (totalOrdenes / totalCotizaciones) * 100 : 0,
      tasaConversionCotizacion:
        totalOrdenes > 0 ? (totalRecibidas / totalOrdenes) * 100 : 0,
      tasaRecepcion:
        totalOrdenes > 0 ? (totalRecibidas / totalOrdenes) * 100 : 0,
      tiempoPromedioGestion,
      valorTotalPipeline: valorTotal,
      valorOrdenesPendientes: valorPendientes,
    };
  }

  /**
   * Análisis del embudo de compras
   */
  async analizarEmbudoCompras(
    empresaId: number,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<IFunnelAnalysisCompras[]> {
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

    const [cotizaciones, ordenes, proveedoresActivos] = await Promise.all([
      this.prisma.cotizacionProveedor.findMany({
        where: whereClause,
        select: {
          id_cotizacion_proveedor: true,
          total: true,
          estado: true,
          id_proveedor: true,
        },
      }),
      this.prisma.ordenCompra.findMany({
        where: whereClause,
        select: {
          id_orden_compra: true,
          total: true,
          estado: true,
          id_proveedor: true,
        },
      }),
      this.prisma.proveedor.count({
        where: { empresa_id: empresaId, activo: true },
      }),
    ]);

    const totalCotizaciones = cotizaciones.length;
    const totalOrdenes = ordenes.length;
    const totalRecibidas = ordenes.filter(
      (o) => o.estado === 'RECIBIDA',
    ).length;

    const montoCotizaciones = cotizaciones.reduce(
      (sum, c) => sum + Number(c.total),
      0,
    );
    const montoOrdenes = ordenes.reduce((sum, o) => sum + Number(o.total), 0);
    const montoRecibidas = ordenes
      .filter((o) => o.estado === 'RECIBIDA')
      .reduce((sum, o) => sum + Number(o.total), 0);

    return [
      {
        etapa: 'Cotizaciones Solicitadas',
        cantidad: totalCotizaciones,
        monto: montoCotizaciones,
        porcentajePerdida: 0,
        tiempoPromedio: 0,
        proveedoresActivos,
      },
      {
        etapa: 'Órdenes de Compra',
        cantidad: totalOrdenes,
        monto: montoOrdenes,
        porcentajePerdida:
          totalCotizaciones > 0
            ? ((totalCotizaciones - totalOrdenes) / totalCotizaciones) * 100
            : 0,
        tiempoPromedio: 3.2, // días promedio de evaluación
        proveedoresActivos: new Set(ordenes.map((o) => o.id_proveedor)).size,
      },
      {
        etapa: 'Mercancía Recibida',
        cantidad: totalRecibidas,
        monto: montoRecibidas,
        porcentajePerdida:
          totalOrdenes > 0
            ? ((totalOrdenes - totalRecibidas) / totalOrdenes) * 100
            : 0,
        tiempoPromedio: 8.5, // días promedio de entrega
        proveedoresActivos: new Set(
          ordenes
            .filter((o) => o.estado === 'RECIBIDA')
            .map((o) => o.id_proveedor),
        ).size,
      },
    ];
  }

  /**
   * Identifica oportunidades de ahorro y optimización
   */
  async identificarOportunidadesAhorro(empresaId: number): Promise<{
    alertas: string[];
    recomendaciones: string[];
    ahorrosPotenciales: IAhorroPotencial[];
    metricas: any;
  }> {
    const stats = await this.obtenerEstadisticasPipeline(empresaId);
    const alertas: string[] = [];
    const recomendaciones: string[] = [];
    const ahorrosPotenciales: IAhorroPotencial[] = [];

    // Analizar cuellos de botella
    if (stats.tasaConversionCotizacion < 60) {
      alertas.push('Baja tasa de conversión de cotizaciones (< 60%)');
      recomendaciones.push(
        'Revisar criterios de selección de proveedores y negociación de precios',
      );
    }

    if (stats.tasaRecepcion < 85) {
      alertas.push('Baja tasa de recepción de órdenes (< 85%)');
      recomendaciones.push(
        'Mejorar seguimiento de entregas y comunicación con proveedores',
      );
    }

    if (stats.tiempoPromedioGestion > 20) {
      alertas.push('Tiempo de gestión muy alto (> 20 días)');
      recomendaciones.push(
        'Implementar automatización en aprobaciones y seguimiento',
      );
    }

    if (stats.ordenesPendientes > stats.ordenesEnTransito * 3) {
      alertas.push('Acumulación excesiva de órdenes pendientes');
      recomendaciones.push(
        'Acelerar proceso de aprobaciones y gestión de compras',
      );
    }

    // Analizar potenciales ahorros (simplificado)
    const comprasRecientes = await this.prisma.ordenCompra.findMany({
      where: {
        id_empresa: empresaId,
        estado: 'RECIBIDA',
        fecha_emision: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Últimos 90 días
        },
      },
      include: {
        items: {
          include: {
            producto: {
              include: {
                categoria: true,
              },
            },
          },
        },
        proveedor: true,
      },
    });

    // Simular análisis de ahorros (en un sistema real, se compararían precios con múltiples proveedores)
    const productosComprados = new Map();
    comprasRecientes.forEach((orden) => {
      orden.items.forEach((item) => {
        const key = `${item.producto.categoria.nombre}-${item.producto.nombre}`;
        if (!productosComprados.has(key)) {
          productosComprados.set(key, []);
        }
        productosComprados.get(key).push({
          proveedor: orden.proveedor.nombre,
          precio: Number(item.precio_unitario),
          cantidad: item.cantidad,
          orden: orden.numero_orden,
        });
      });
    });

    // Identificar productos con múltiples proveedores y posibles ahorros
    for (const [producto, compras] of productosComprados) {
      if (compras.length > 1) {
        const precioMinimo = Math.min(...compras.map((c) => c.precio));
        const precioMaximo = Math.max(...compras.map((c) => c.precio));

        if ((precioMaximo - precioMinimo) / precioMaximo > 0.1) {
          // Diferencia > 10%
          const compraCaraInformacion = compras.find(
            (c) => c.precio === precioMaximo,
          );
          const compraBarataInformacion = compras.find(
            (c) => c.precio === precioMinimo,
          );

          ahorrosPotenciales.push({
            categoria: producto,
            proveedorActual: compraCaraInformacion.proveedor,
            proveedorAlternativo: compraBarataInformacion.proveedor,
            precioActual: precioMaximo,
            precioAlternativo: precioMinimo,
            ahorroUnitario: precioMaximo - precioMinimo,
            volumenAnual: compras.reduce((sum, c) => sum + c.cantidad, 0) * 4, // Estimación anual
            ahorroAnualPotencial:
              (precioMaximo - precioMinimo) *
              compras.reduce((sum, c) => sum + c.cantidad, 0) *
              4,
            porcentajeAhorro:
              ((precioMaximo - precioMinimo) / precioMaximo) * 100,
          });
        }
      }
    }

    return {
      alertas,
      recomendaciones,
      ahorrosPotenciales,
      metricas: stats,
    };
  }

  // Métodos auxiliares privados

  private generarNumeroOrden(ultimoNumero?: string): string {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');

    if (!ultimoNumero) {
      return `OC${año}${mes}0001`;
    }

    // Extraer número secuencial del último número
    const match = ultimoNumero.match(/OC\d{4}(\d{4})$/);
    if (match) {
      const ultimoSecuencial = parseInt(match[1]);
      const nuevoSecuencial = (ultimoSecuencial + 1)
        .toString()
        .padStart(4, '0');
      return `OC${año}${mes}${nuevoSecuencial}`;
    }

    return `OC${año}${mes}0001`;
  }
}
