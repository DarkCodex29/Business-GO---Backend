import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IComprasValidator {
  validateEmpresaExists(empresaId: number): Promise<void>;
  validateProveedorEmpresa(
    proveedorId: number,
    empresaId: number,
  ): Promise<void>;
  validateProductoEmpresa(productoId: number, empresaId: number): Promise<void>;
  validateOrdenCompraEmpresa(ordenId: number, empresaId: number): Promise<void>;
  validateEstadoOrdenCompra(estado: string, operacion: string): void;
  validateRucProveedor(ruc: string): void;
  validateProveedorActivo(proveedorId: number): Promise<void>;
  validateStockSuficiente(productoId: number, cantidad: number): Promise<void>;
  validateLimitesEmpresariales(
    empresaId: number,
    tipoLimite: string,
  ): Promise<void>;
}

@Injectable()
export class ComprasValidationService implements IComprasValidator {
  private readonly ESTADOS_ORDEN_VALIDOS = [
    'PENDIENTE',
    'CONFIRMADA',
    'EN_PROCESO',
    'RECIBIDA',
    'CANCELADA',
  ];

  private readonly ESTADOS_FACTURA_VALIDOS = [
    'PENDIENTE',
    'PAGADA',
    'VENCIDA',
    'ANULADA',
  ];

  private readonly ESTADOS_PAGO_VALIDOS = [
    'PENDIENTE',
    'PROCESANDO',
    'COMPLETADO',
    'FALLIDO',
    'CANCELADO',
  ];

  // Límites empresariales para contexto peruano
  private readonly LIMITE_ITEMS_ORDEN = 100;
  private readonly LIMITE_MONTO_ORDEN = 1000000; // S/ 1,000,000
  private readonly LIMITE_ORDENES_MENSUALES = 500;

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

  async validateProveedorEmpresa(
    proveedorId: number,
    empresaId: number,
  ): Promise<void> {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: {
        id_proveedor: proveedorId,
        empresa_id: empresaId,
      },
      select: { id_proveedor: true, nombre: true, activo: true },
    });

    if (!proveedor) {
      throw new NotFoundException(
        `Proveedor con ID ${proveedorId} no encontrado o no pertenece a la empresa ${empresaId}`,
      );
    }

    if (!proveedor.activo) {
      throw new BadRequestException(
        `El proveedor "${proveedor.nombre}" no está activo`,
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

  async validateOrdenCompraEmpresa(
    ordenId: number,
    empresaId: number,
  ): Promise<void> {
    const orden = await this.prisma.ordenCompra.findFirst({
      where: {
        id_orden_compra: ordenId,
        id_empresa: empresaId,
      },
      select: { id_orden_compra: true, estado: true, numero_orden: true },
    });

    if (!orden) {
      throw new NotFoundException(
        `Orden de compra con ID ${ordenId} no encontrada o no pertenece a la empresa ${empresaId}`,
      );
    }
  }

  validateEstadoOrdenCompra(estado: string, operacion: string): void {
    if (!this.ESTADOS_ORDEN_VALIDOS.includes(estado.toUpperCase())) {
      throw new BadRequestException(
        `Estado de orden inválido: ${estado}. Estados válidos: ${this.ESTADOS_ORDEN_VALIDOS.join(', ')}`,
      );
    }

    // Validaciones específicas por operación
    switch (operacion.toUpperCase()) {
      case 'FACTURAR':
        if (
          !['CONFIRMADA', 'EN_PROCESO', 'RECIBIDA'].includes(
            estado.toUpperCase(),
          )
        ) {
          throw new BadRequestException(
            `No se puede facturar una orden en estado ${estado}`,
          );
        }
        break;
      case 'MODIFICAR':
        if (['RECIBIDA', 'CANCELADA'].includes(estado.toUpperCase())) {
          throw new BadRequestException(
            `No se puede modificar una orden en estado ${estado}`,
          );
        }
        break;
      case 'CANCELAR':
        if (['RECIBIDA'].includes(estado.toUpperCase())) {
          throw new BadRequestException(
            `No se puede cancelar una orden en estado ${estado}`,
          );
        }
        break;
      case 'RECIBIR':
        if (!['CONFIRMADA', 'EN_PROCESO'].includes(estado.toUpperCase())) {
          throw new BadRequestException(
            `Solo se pueden recibir órdenes en estado CONFIRMADA o EN_PROCESO`,
          );
        }
        break;
    }
  }

  validateRucProveedor(ruc: string): void {
    // Validación RUC peruano (11 dígitos)
    if (!ruc || ruc.length !== 11) {
      throw new BadRequestException('El RUC debe tener exactamente 11 dígitos');
    }

    if (!/^\d{11}$/.test(ruc)) {
      throw new BadRequestException('El RUC debe contener solo números');
    }

    // Validar que comience con 10, 15, 17 o 20 (tipos de RUC válidos)
    const prefijo = ruc.substring(0, 2);
    if (!['10', '15', '17', '20'].includes(prefijo)) {
      throw new BadRequestException('El RUC debe comenzar con 10, 15, 17 o 20');
    }
  }

  async validateProveedorActivo(proveedorId: number): Promise<void> {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id_proveedor: proveedorId },
      select: { activo: true, nombre: true },
    });

    if (!proveedor) {
      throw new NotFoundException(
        `Proveedor con ID ${proveedorId} no encontrado`,
      );
    }

    if (!proveedor.activo) {
      throw new BadRequestException(
        `El proveedor "${proveedor.nombre}" no está activo`,
      );
    }
  }

  async validateStockSuficiente(
    productoId: number,
    cantidad: number,
  ): Promise<void> {
    // Para órdenes de compra, validamos que no se exceda el stock máximo
    const productoProveedor = await this.prisma.productoProveedor.findFirst({
      where: { id_producto: productoId },
      select: { stock_maximo: true, stock_minimo: true },
    });

    if (
      productoProveedor?.stock_maximo &&
      cantidad > productoProveedor.stock_maximo
    ) {
      throw new BadRequestException(
        `La cantidad solicitada (${cantidad}) excede el stock máximo permitido (${productoProveedor.stock_maximo})`,
      );
    }
  }

  async validateLimitesEmpresariales(
    empresaId: number,
    tipoLimite: string,
  ): Promise<void> {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    switch (tipoLimite.toUpperCase()) {
      case 'ORDENES_MENSUALES':
        const ordenesEsteMes = await this.prisma.ordenCompra.count({
          where: {
            id_empresa: empresaId,
            fecha_emision: {
              gte: inicioMes,
              lte: finMes,
            },
          },
        });

        if (ordenesEsteMes >= this.LIMITE_ORDENES_MENSUALES) {
          throw new BadRequestException(
            `Se ha alcanzado el límite mensual de ${this.LIMITE_ORDENES_MENSUALES} órdenes de compra`,
          );
        }
        break;
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

    if (precio > this.LIMITE_MONTO_ORDEN) {
      throw new BadRequestException(
        `El precio en ${contexto} no puede exceder S/ ${this.LIMITE_MONTO_ORDEN.toLocaleString()}`,
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

  validateNumeroOrden(numeroOrden: string, empresaId: number): void {
    if (!numeroOrden || numeroOrden.trim().length === 0) {
      throw new BadRequestException('El número de orden es obligatorio');
    }

    if (numeroOrden.length > 20) {
      throw new BadRequestException(
        'El número de orden no puede exceder 20 caracteres',
      );
    }

    // Validar formato sugerido para Perú: OC-YYYY-NNNN
    const formatoValido = /^OC-\d{4}-\d{3,6}$/.test(numeroOrden);
    if (!formatoValido) {
      throw new BadRequestException(
        'El número de orden debe seguir el formato: OC-YYYY-NNNN (ej: OC-2024-001)',
      );
    }
  }

  async validateNumeroOrdenUnico(
    numeroOrden: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = {
      numero_orden: numeroOrden,
      id_empresa: empresaId,
    };

    if (excludeId) {
      whereClause.id_orden_compra = { not: excludeId };
    }

    const ordenExistente = await this.prisma.ordenCompra.findFirst({
      where: whereClause,
      select: { id_orden_compra: true },
    });

    if (ordenExistente) {
      throw new BadRequestException(
        `Ya existe una orden de compra con el número ${numeroOrden}`,
      );
    }
  }

  validateFechaEntrega(fechaEmision: Date, fechaEntrega?: Date): void {
    if (!fechaEntrega) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const emision = new Date(fechaEmision);
    emision.setHours(0, 0, 0, 0);

    const entrega = new Date(fechaEntrega);
    entrega.setHours(0, 0, 0, 0);

    if (entrega < emision) {
      throw new BadRequestException(
        'La fecha de entrega no puede ser anterior a la fecha de emisión',
      );
    }

    // Validar que la entrega no sea mayor a 365 días (práctica empresarial)
    const maxEntrega = new Date(emision);
    maxEntrega.setDate(maxEntrega.getDate() + 365);

    if (entrega > maxEntrega) {
      throw new BadRequestException(
        'La fecha de entrega no puede ser mayor a 365 días desde la emisión',
      );
    }
  }

  validateMontoTotal(montoTotal: number): void {
    if (montoTotal > this.LIMITE_MONTO_ORDEN) {
      throw new BadRequestException(
        `El monto total de la orden no puede exceder S/ ${this.LIMITE_MONTO_ORDEN.toLocaleString()}`,
      );
    }
  }

  validateItemsOrden(items: any[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('La orden debe incluir al menos un item');
    }

    if (items.length > this.LIMITE_ITEMS_ORDEN) {
      throw new BadRequestException(
        `No se pueden incluir más de ${this.LIMITE_ITEMS_ORDEN} items por orden`,
      );
    }

    // Validar que no haya productos duplicados
    const productosIds = items.map((item) => item.id_producto);
    const productosUnicos = new Set(productosIds);

    if (productosIds.length !== productosUnicos.size) {
      throw new BadRequestException(
        'No se pueden incluir productos duplicados en la misma orden',
      );
    }
  }
}
