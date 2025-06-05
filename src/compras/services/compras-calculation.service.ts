import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';

export interface IItemCompraCalculation {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
}

export interface ICompraCalculationResult {
  subtotal: Decimal;
  descuento: Decimal;
  igv: Decimal;
  total: Decimal;
  items: IItemCompraCalculationResult[];
}

export interface IItemCompraCalculationResult {
  id_producto: number;
  cantidad: number;
  precio_unitario: Decimal;
  descuento: Decimal;
  subtotal: Decimal;
}

export interface IComprasCalculator {
  calculateOrdenCompra(items: IItemCompraCalculation[]): Promise<ICompraCalculationResult>;
  calculateFacturaCompra(items: IItemCompraCalculation[]): Promise<ICompraCalculationResult>;
  calculateItemSubtotal(
    cantidad: number,
    precioUnitario: number,
    descuento?: number,
  ): Decimal;
  calculateIGV(baseImponible: Decimal): Decimal;
  calculateTotal(subtotal: Decimal, descuento: Decimal, igv: Decimal): Decimal;
  calculateDescuentoProveedor(
    subtotal: Decimal,
    proveedorId: number,
  ): Promise<Decimal>;
}

@Injectable()
export class ComprasCalculationService implements IComprasCalculator {
  private readonly logger = new Logger(ComprasCalculationService.name);

  // Configuración tributaria peruana para compras
  private readonly IGV_RATE = new Decimal(0.18); // 18% IGV en Perú
  private readonly PRECISION_DECIMALES = 2;
  private readonly REDONDEO_CENTIMOS = true;

  constructor(private readonly prisma: PrismaService) {}

  async calculateOrdenCompra(
    items: IItemCompraCalculation[],
  ): Promise<ICompraCalculationResult> {
    this.logger.log(`Calculando orden de compra con ${items.length} items`);
    return this.performCalculation(items, 'ORDEN_COMPRA');
  }

  async calculateFacturaCompra(
    items: IItemCompraCalculation[],
  ): Promise<ICompraCalculationResult> {
    this.logger.log(`Calculando factura de compra con ${items.length} items`);
    return this.performCalculation(items, 'FACTURA_COMPRA');
  }

  private async performCalculation(
    items: IItemCompraCalculation[],
    tipo: 'ORDEN_COMPRA' | 'FACTURA_COMPRA',
  ): Promise<ICompraCalculationResult> {
    let subtotalTotal = new Decimal(0);
    let descuentoTotal = new Decimal(0);
    const itemsCalculados: IItemCompraCalculationResult[] = [];

    // Calcular cada item
    for (const item of items) {
      const itemCalculado = await this.calculateSingleItem(item);
      itemsCalculados.push(itemCalculado);

      subtotalTotal = subtotalTotal.add(itemCalculado.subtotal);
      descuentoTotal = descuentoTotal.add(itemCalculado.descuento);
    }

    // Calcular base imponible (subtotal - descuento)
    const baseImponible = subtotalTotal.sub(descuentoTotal);

    // Calcular IGV
    const igv = this.calculateIGV(baseImponible);

    // Calcular total
    const total = this.calculateTotal(subtotalTotal, descuentoTotal, igv);

    const resultado = {
      subtotal: this.roundToDecimals(subtotalTotal),
      descuento: this.roundToDecimals(descuentoTotal),
      igv: this.roundToDecimals(igv),
      total: this.roundToDecimals(total),
      items: itemsCalculados,
    };

    this.logger.log(
      `Cálculo ${tipo} completado: Subtotal: S/ ${resultado.subtotal}, IGV: S/ ${resultado.igv}, Total: S/ ${resultado.total}`,
    );

    return resultado;
  }

  private async calculateSingleItem(
    item: IItemCompraCalculation,
  ): Promise<IItemCompraCalculationResult> {
    const cantidad = new Decimal(item.cantidad);
    const precioUnitario = new Decimal(item.precio_unitario);
    const descuento = new Decimal(item.descuento || 0);

    // Calcular subtotal del item (cantidad * precio unitario)
    const subtotalItem = cantidad.mul(precioUnitario);

    // El descuento puede ser un monto fijo o porcentaje
    let descuentoItem: Decimal;
    if (descuento.lte(100) && descuento.gt(0)) {
      // Si es <= 100, asumimos que es porcentaje
      descuentoItem = subtotalItem.mul(descuento.div(100));
    } else {
      // Si es > 100, asumimos que es monto fijo
      descuentoItem = descuento;
    }

    // Validar que el descuento no exceda el subtotal
    if (descuentoItem.gt(subtotalItem)) {
      descuentoItem = subtotalItem;
    }

    const subtotalFinal = subtotalItem.sub(descuentoItem);

    return {
      id_producto: item.id_producto,
      cantidad: item.cantidad,
      precio_unitario: this.roundToDecimals(precioUnitario),
      descuento: this.roundToDecimals(descuentoItem),
      subtotal: this.roundToDecimals(subtotalFinal),
    };
  }

  calculateItemSubtotal(
    cantidad: number,
    precioUnitario: number,
    descuento?: number,
  ): Decimal {
    const cantidadDecimal = new Decimal(cantidad);
    const precioDecimal = new Decimal(precioUnitario);
    const descuentoDecimal = new Decimal(descuento || 0);

    const subtotal = cantidadDecimal.mul(precioDecimal);
    const descuentoAplicado = subtotal.mul(descuentoDecimal.div(100));

    return this.roundToDecimals(subtotal.sub(descuentoAplicado));
  }

  calculateIGV(baseImponible: Decimal): Decimal {
    const igv = baseImponible.mul(this.IGV_RATE);
    return this.roundToDecimals(igv);
  }

  calculateTotal(subtotal: Decimal, descuento: Decimal, igv: Decimal): Decimal {
    const baseImponible = subtotal.sub(descuento);
    const total = baseImponible.add(igv);
    return this.roundToDecimals(total);
  }

  async calculateDescuentoProveedor(
    subtotal: Decimal,
    proveedorId: number,
  ): Promise<Decimal> {
    // Obtener configuración de descuentos por volumen del proveedor
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id_proveedor: proveedorId },
      select: { id_proveedor: true },
    });

    if (!proveedor) {
      return new Decimal(0);
    }

    // Lógica de descuentos por volumen (puede ser configurada por empresa)
    let porcentajeDescuento = new Decimal(0);

    if (subtotal.gte(50000)) {
      // Descuento 5% para compras >= S/ 50,000
      porcentajeDescuento = new Decimal(5);
    } else if (subtotal.gte(20000)) {
      // Descuento 3% para compras >= S/ 20,000
      porcentajeDescuento = new Decimal(3);
    } else if (subtotal.gte(10000)) {
      // Descuento 1% para compras >= S/ 10,000
      porcentajeDescuento = new Decimal(1);
    }

    const descuento = subtotal.mul(porcentajeDescuento.div(100));
    return this.roundToDecimals(descuento);
  }

  private roundToDecimals(value: Decimal): Decimal {
    if (this.REDONDEO_CENTIMOS) {
      // Redondear a céntimos (0.01)
      return value.toDecimalPlaces(
        this.PRECISION_DECIMALES,
        Decimal.ROUND_HALF_UP,
      );
    }
    return value.toDecimalPlaces(this.PRECISION_DECIMALES);
  }

  // Método para obtener configuración tributaria de la empresa
  async getConfiguracionTributaria(empresaId: number) {
    const configuracion = await this.prisma.configuracionImpuestos.findUnique({
      where: { id_empresa: empresaId },
      select: {
        tasa_igv: true,
        redondeo: true,
        incluir_impuestos: true,
      },
    });

    return {
      tasaIGV: configuracion?.tasa_igv || this.IGV_RATE,
      redondeo: configuracion?.redondeo || this.PRECISION_DECIMALES,
      incluirImpuestos: configuracion?.incluir_impuestos ?? true,
    };
  }

  // Método para validar cálculos
  validateCalculation(resultado: ICompraCalculationResult): boolean {
    try {
      // Validar que el total sea la suma correcta
      const baseImponible = resultado.subtotal.sub(resultado.descuento);
      const totalCalculado = baseImponible.add(resultado.igv);

      const diferencia = resultado.total.sub(totalCalculado).abs();
      const tolerancia = new Decimal(0.01); // Tolerancia de 1 céntimo

      if (diferencia.gt(tolerancia)) {
        this.logger.warn(
          `Diferencia en cálculo detectada: ${diferencia.toString()}. Total esperado: ${totalCalculado.toString()}, Total actual: ${resultado.total.toString()}`,
        );
        return false;
      }

      // Validar que el IGV sea correcto
      const igvCalculado = this.calculateIGV(baseImponible);
      const diferenciaIGV = resultado.igv.sub(igvCalculado).abs();

      if (diferenciaIGV.gt(tolerancia)) {
        this.logger.warn(
          `Diferencia en IGV detectada: ${diferenciaIGV.toString()}. IGV esperado: ${igvCalculado.toString()}, IGV actual: ${resultado.igv.toString()}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validando cálculo: ${error.message}`);
      return false;
    }
  }

  // Método para calcular costo promedio ponderado
  async calculateCostoPromedioPonderado(
    productoId: number,
    empresaId: number,
  ): Promise<Decimal> {
    const comprasRecientes = await this.prisma.itemOrdenCompra.findMany({
      where: {
        id_producto: productoId,
        orden_compra: {
          id_empresa: empresaId,
          estado: 'RECIBIDA',
          fecha_emision: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Últimos 90 días
          },
        },
      },
      select: {
        cantidad: true,
        precio_unitario: true,
      },
    });

    if (comprasRecientes.length === 0) {
      return new Decimal(0);
    }

    let totalCantidad = new Decimal(0);
    let totalCosto = new Decimal(0);

    for (const compra of comprasRecientes) {
      const cantidad = new Decimal(compra.cantidad);
      const precio = new Decimal(compra.precio_unitario);
      
      totalCantidad = totalCantidad.add(cantidad);
      totalCosto = totalCosto.add(cantidad.mul(precio));
    }

    if (totalCantidad.eq(0)) {
      return new Decimal(0);
    }

    return this.roundToDecimals(totalCosto.div(totalCantidad));
  }

  // Método para generar resumen de cálculo
  generateCalculationSummary(resultado: ICompraCalculationResult): string {
    const baseImponible = resultado.subtotal.sub(resultado.descuento);
    const porcentajeIGV = this.IGV_RATE.mul(100);

    return `
Resumen de Cálculo de Compra:
- Subtotal: S/ ${resultado.subtotal.toFixed(2)}
- Descuento: S/ ${resultado.descuento.toFixed(2)}
- Base Imponible: S/ ${baseImponible.toFixed(2)}
- IGV (${porcentajeIGV.toFixed(0)}%): S/ ${resultado.igv.toFixed(2)}
- Total: S/ ${resultado.total.toFixed(2)}
- Items: ${resultado.items.length}
    `.trim();
  }

  // Método para calcular ahorro por descuentos
  calculateAhorroDescuentos(
    subtotalOriginal: Decimal,
    descuentoAplicado: Decimal,
  ): { porcentajeAhorro: Decimal; montoAhorrado: Decimal } {
    const porcentajeAhorro = subtotalOriginal.gt(0)
      ? descuentoAplicado.div(subtotalOriginal).mul(100)
      : new Decimal(0);

    return {
      porcentajeAhorro: this.roundToDecimals(porcentajeAhorro),
      montoAhorrado: this.roundToDecimals(descuentoAplicado),
    };
  }

  // Método para proyectar costos anuales
  async proyectarCostosAnuales(
    empresaId: number,
    mesesHistorico: number = 6,
  ): Promise<{
    promedioMensual: Decimal;
    proyeccionAnual: Decimal;
    tendencia: 'CRECIENTE' | 'DECRECIENTE' | 'ESTABLE';
  }> {
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - mesesHistorico);

    const comprasHistoricas = await this.prisma.ordenCompra.groupBy({
      by: ['fecha_emision'],
      where: {
        id_empresa: empresaId,
        estado: 'RECIBIDA',
        fecha_emision: {
          gte: fechaInicio,
        },
      },
      _sum: {
        total: true,
      },
    });

    if (comprasHistoricas.length === 0) {
      return {
        promedioMensual: new Decimal(0),
        proyeccionAnual: new Decimal(0),
        tendencia: 'ESTABLE',
      };
    }

    const totalCompras = comprasHistoricas.reduce(
      (acc, compra) => acc.add(new Decimal(compra._sum.total || 0)),
      new Decimal(0),
    );

    const promedioMensual = totalCompras.div(mesesHistorico);
    const proyeccionAnual = promedioMensual.mul(12);

    // Calcular tendencia (simplificada)
    const primerTrimestre = comprasHistoricas.slice(0, 3);
    const segundoTrimestre = comprasHistoricas.slice(-3);

    const promedioPrimero = primerTrimestre.reduce(
      (acc, compra) => acc.add(new Decimal(compra._sum.total || 0)),
      new Decimal(0),
    ).div(3);

    const promedioSegundo = segundoTrimestre.reduce(
      (acc, compra) => acc.add(new Decimal(compra._sum.total || 0)),
      new Decimal(0),
    ).div(3);

    let tendencia: 'CRECIENTE' | 'DECRECIENTE' | 'ESTABLE' = 'ESTABLE';
    const diferencia = promedioSegundo.sub(promedioPrimero);
    const porcentajeCambio = promedioPrimero.gt(0)
      ? diferencia.div(promedioPrimero).mul(100)
      : new Decimal(0);

    if (porcentajeCambio.gt(10)) {
      tendencia = 'CRECIENTE';
    } else if (porcentajeCambio.lt(-10)) {
      tendencia = 'DECRECIENTE';
    }

    return {
      promedioMensual: this.roundToDecimals(promedioMensual),
      proyeccionAnual: this.roundToDecimals(proyeccionAnual),
      tendencia,
    };
  }
} 