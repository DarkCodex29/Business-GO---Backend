import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';

export interface IItemCalculation {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
}

export interface ICalculationResult {
  subtotal: Decimal;
  descuento: Decimal;
  igv: Decimal;
  total: Decimal;
  items: IItemCalculationResult[];
}

export interface IItemCalculationResult {
  id_producto: number;
  cantidad: number;
  precio_unitario: Decimal;
  descuento: Decimal;
  subtotal: Decimal;
}

export interface IVentasCalculator {
  calculateCotizacion(items: IItemCalculation[]): Promise<ICalculationResult>;
  calculateOrdenVenta(items: IItemCalculation[]): Promise<ICalculationResult>;
  calculateFactura(items: IItemCalculation[]): Promise<ICalculationResult>;
  calculateItemSubtotal(
    cantidad: number,
    precioUnitario: number,
    descuento?: number,
  ): Decimal;
  calculateIGV(baseImponible: Decimal): Decimal;
  calculateTotal(subtotal: Decimal, descuento: Decimal, igv: Decimal): Decimal;
}

@Injectable()
export class VentasCalculationService implements IVentasCalculator {
  private readonly logger = new Logger(VentasCalculationService.name);

  // Configuración tributaria peruana
  private readonly IGV_RATE = new Decimal(0.18); // 18% IGV en Perú
  private readonly PRECISION_DECIMALES = 2;
  private readonly REDONDEO_CENTIMOS = true;

  constructor(private readonly prisma: PrismaService) {}

  async calculateCotizacion(
    items: IItemCalculation[],
  ): Promise<ICalculationResult> {
    this.logger.log(`Calculando cotización con ${items.length} items`);
    return this.performCalculation(items, 'COTIZACION');
  }

  async calculateOrdenVenta(
    items: IItemCalculation[],
  ): Promise<ICalculationResult> {
    this.logger.log(`Calculando orden de venta con ${items.length} items`);
    return this.performCalculation(items, 'ORDEN_VENTA');
  }

  async calculateFactura(
    items: IItemCalculation[],
  ): Promise<ICalculationResult> {
    this.logger.log(`Calculando factura con ${items.length} items`);
    return this.performCalculation(items, 'FACTURA');
  }

  private async performCalculation(
    items: IItemCalculation[],
    tipo: 'COTIZACION' | 'ORDEN_VENTA' | 'FACTURA',
  ): Promise<ICalculationResult> {
    let subtotalTotal = new Decimal(0);
    let descuentoTotal = new Decimal(0);
    const itemsCalculados: IItemCalculationResult[] = [];

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
    item: IItemCalculation,
  ): Promise<IItemCalculationResult> {
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
  validateCalculation(resultado: ICalculationResult): boolean {
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

  // Método para generar resumen de cálculo
  generateCalculationSummary(resultado: ICalculationResult): string {
    const baseImponible = resultado.subtotal.sub(resultado.descuento);
    const porcentajeIGV = this.IGV_RATE.mul(100);

    return `
Resumen de Cálculo:
- Subtotal: S/ ${resultado.subtotal.toFixed(2)}
- Descuento: S/ ${resultado.descuento.toFixed(2)}
- Base Imponible: S/ ${baseImponible.toFixed(2)}
- IGV (${porcentajeIGV.toFixed(0)}%): S/ ${resultado.igv.toFixed(2)}
- Total: S/ ${resultado.total.toFixed(2)}
- Items: ${resultado.items.length}
    `.trim();
  }
}
