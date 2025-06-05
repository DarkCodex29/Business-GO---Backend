import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IVentasValidator {
  validateEmpresaExists(empresaId: number): Promise<void>;
  validateClienteEmpresa(clienteId: number, empresaId: number): Promise<void>;
  validateProductoEmpresa(productoId: number, empresaId: number): Promise<void>;
  validateCotizacionEmpresa(
    cotizacionId: number,
    empresaId: number,
  ): Promise<void>;
  validateOrdenVentaEmpresa(ordenId: number, empresaId: number): Promise<void>;
  validateEstadoCotizacion(estado: string, operacion: string): void;
  validateEstadoOrdenVenta(estado: string, operacion: string): void;
  validateFechaValidez(fechaEmision: Date, fechaValidez: Date): void;
  validateStockDisponible(productoId: number, cantidad: number): Promise<void>;
}

@Injectable()
export class VentasValidationService implements IVentasValidator {
  private readonly ESTADOS_COTIZACION_VALIDOS = [
    'PENDIENTE',
    'ENVIADA',
    'ACEPTADA',
    'RECHAZADA',
    'VENCIDA',
  ];

  private readonly ESTADOS_ORDEN_VALIDOS = [
    'PENDIENTE',
    'CONFIRMADA',
    'EN_PROCESO',
    'ENVIADA',
    'ENTREGADA',
    'CANCELADA',
  ];

  private readonly ESTADOS_FACTURA_VALIDOS = [
    'EMITIDA',
    'PAGADA',
    'VENCIDA',
    'ANULADA',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async validateEmpresaExists(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
      select: { id_empresa: true, nombre: true, estado: true },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }

    if (empresa.estado !== 'activo') {
      throw new BadRequestException(
        `La empresa "${empresa.nombre}" no está activa`,
      );
    }
  }

  async validateClienteEmpresa(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
      include: {
        cliente: {
          select: { nombre: true },
        },
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado o no pertenece a la empresa ${empresaId}`,
      );
    }
  }

  async validateProductoEmpresa(
    productoId: number,
    empresaId: number,
  ): Promise<void> {
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: productoId,
        id_empresa: empresaId,
      },
      select: { id_producto: true, nombre: true, es_servicio: true },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${productoId} no encontrado o no pertenece a la empresa ${empresaId}`,
      );
    }
  }

  async validateCotizacionEmpresa(
    cotizacionId: number,
    empresaId: number,
  ): Promise<void> {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: {
        id_cotizacion: cotizacionId,
        id_empresa: empresaId,
      },
      select: { id_cotizacion: true, estado: true },
    });

    if (!cotizacion) {
      throw new NotFoundException(
        `Cotización con ID ${cotizacionId} no encontrada o no pertenece a la empresa ${empresaId}`,
      );
    }
  }

  async validateOrdenVentaEmpresa(
    ordenId: number,
    empresaId: number,
  ): Promise<void> {
    const orden = await this.prisma.ordenVenta.findFirst({
      where: {
        id_orden_venta: ordenId,
        id_empresa: empresaId,
      },
      select: { id_orden_venta: true, estado: true },
    });

    if (!orden) {
      throw new NotFoundException(
        `Orden de venta con ID ${ordenId} no encontrada o no pertenece a la empresa ${empresaId}`,
      );
    }
  }

  validateEstadoCotizacion(estado: string, operacion: string): void {
    if (!this.ESTADOS_COTIZACION_VALIDOS.includes(estado.toUpperCase())) {
      throw new BadRequestException(
        `Estado de cotización inválido: ${estado}. Estados válidos: ${this.ESTADOS_COTIZACION_VALIDOS.join(', ')}`,
      );
    }

    // Validaciones específicas por operación
    switch (operacion.toUpperCase()) {
      case 'CONVERTIR_ORDEN':
        if (estado.toUpperCase() !== 'ACEPTADA') {
          throw new BadRequestException(
            'Solo se pueden convertir cotizaciones en estado ACEPTADA',
          );
        }
        break;
      case 'MODIFICAR':
        if (
          ['ACEPTADA', 'RECHAZADA', 'VENCIDA'].includes(estado.toUpperCase())
        ) {
          throw new BadRequestException(
            `No se puede modificar una cotización en estado ${estado}`,
          );
        }
        break;
      case 'ELIMINAR':
        if (['ACEPTADA'].includes(estado.toUpperCase())) {
          throw new BadRequestException(
            `No se puede eliminar una cotización en estado ${estado}`,
          );
        }
        break;
    }
  }

  validateEstadoOrdenVenta(estado: string, operacion: string): void {
    if (!this.ESTADOS_ORDEN_VALIDOS.includes(estado.toUpperCase())) {
      throw new BadRequestException(
        `Estado de orden inválido: ${estado}. Estados válidos: ${this.ESTADOS_ORDEN_VALIDOS.join(', ')}`,
      );
    }

    // Validaciones específicas por operación
    switch (operacion.toUpperCase()) {
      case 'FACTURAR':
        if (
          !['CONFIRMADA', 'EN_PROCESO', 'ENVIADA', 'ENTREGADA'].includes(
            estado.toUpperCase(),
          )
        ) {
          throw new BadRequestException(
            `No se puede facturar una orden en estado ${estado}`,
          );
        }
        break;
      case 'MODIFICAR':
        if (['ENTREGADA', 'CANCELADA'].includes(estado.toUpperCase())) {
          throw new BadRequestException(
            `No se puede modificar una orden en estado ${estado}`,
          );
        }
        break;
      case 'CANCELAR':
        if (['ENTREGADA'].includes(estado.toUpperCase())) {
          throw new BadRequestException(
            `No se puede cancelar una orden en estado ${estado}`,
          );
        }
        break;
    }
  }

  validateFechaValidez(fechaEmision: Date, fechaValidez: Date): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const emision = new Date(fechaEmision);
    emision.setHours(0, 0, 0, 0);

    const validez = new Date(fechaValidez);
    validez.setHours(0, 0, 0, 0);

    if (emision < hoy) {
      throw new BadRequestException(
        'La fecha de emisión no puede ser anterior a hoy',
      );
    }

    if (validez <= emision) {
      throw new BadRequestException(
        'La fecha de validez debe ser posterior a la fecha de emisión',
      );
    }

    // Validar que la validez no sea mayor a 90 días (práctica empresarial peruana)
    const maxValidez = new Date(emision);
    maxValidez.setDate(maxValidez.getDate() + 90);

    if (validez > maxValidez) {
      throw new BadRequestException(
        'La fecha de validez no puede ser mayor a 90 días desde la emisión',
      );
    }
  }

  async validateStockDisponible(
    productoId: number,
    cantidad: number,
  ): Promise<void> {
    // Verificar si es un producto físico
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: productoId },
      select: { es_servicio: true, nombre: true },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${productoId} no encontrado`,
      );
    }

    // Si es servicio, no validar stock
    if (producto.es_servicio) {
      return;
    }

    // Validar stock disponible para productos físicos
    const disponibilidad = await this.prisma.disponibilidad.findUnique({
      where: { id_producto: productoId },
      select: { cantidad_disponible: true },
    });

    if (!disponibilidad) {
      throw new BadRequestException(
        `No hay información de disponibilidad para el producto "${producto.nombre}"`,
      );
    }

    if (disponibilidad.cantidad_disponible < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente para el producto "${producto.nombre}". Disponible: ${disponibilidad.cantidad_disponible}, Solicitado: ${cantidad}`,
      );
    }
  }

  validateCantidad(cantidad: number, contexto: string): void {
    if (cantidad <= 0) {
      throw new BadRequestException(
        `La cantidad en ${contexto} debe ser mayor a 0`,
      );
    }

    if (cantidad > 999999) {
      throw new BadRequestException(
        `La cantidad en ${contexto} no puede exceder 999,999 unidades`,
      );
    }

    if (!Number.isInteger(cantidad)) {
      throw new BadRequestException(
        `La cantidad en ${contexto} debe ser un número entero`,
      );
    }
  }

  validatePrecio(precio: number, contexto: string): void {
    if (precio <= 0) {
      throw new BadRequestException(
        `El precio en ${contexto} debe ser mayor a 0`,
      );
    }

    if (precio > 1000000) {
      throw new BadRequestException(
        `El precio en ${contexto} no puede exceder S/ 1,000,000`,
      );
    }

    // Validar máximo 2 decimales
    const decimales = (precio.toString().split('.')[1] || '').length;
    if (decimales > 2) {
      throw new BadRequestException(
        `El precio en ${contexto} no puede tener más de 2 decimales`,
      );
    }
  }

  validateDescuento(
    descuento: number,
    subtotal: number,
    contexto: string,
  ): void {
    if (descuento < 0) {
      throw new BadRequestException(
        `El descuento en ${contexto} no puede ser negativo`,
      );
    }

    if (descuento > subtotal) {
      throw new BadRequestException(
        `El descuento en ${contexto} no puede ser mayor al subtotal`,
      );
    }

    // Validar que el descuento no sea mayor al 50% (política empresarial)
    const porcentajeDescuento = (descuento / subtotal) * 100;
    if (porcentajeDescuento > 50) {
      throw new BadRequestException(
        `El descuento en ${contexto} no puede exceder el 50% del subtotal`,
      );
    }
  }
}
