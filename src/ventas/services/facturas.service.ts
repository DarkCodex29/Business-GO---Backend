import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFacturaDto } from '../dto/create-factura.dto';
import { UpdateFacturaDto } from '../dto/update-factura.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FacturasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFacturaDto: CreateFacturaDto) {
    const { id_orden_venta, items, ...rest } = createFacturaDto;

    // Validar que la orden de venta existe
    const ordenVenta = await this.prisma.ordenVenta.findUnique({
      where: { id_orden_venta: Number(id_orden_venta) },
      include: {
        items: true,
      },
    });

    if (!ordenVenta) {
      throw new NotFoundException(
        `Orden de venta con ID ${id_orden_venta} no encontrada`,
      );
    }

    // Validar productos y calcular totales
    let subtotal = new Decimal(0);
    let descuento = new Decimal(0);
    let igv = new Decimal(0);
    let total = new Decimal(0);

    for (const item of items) {
      const producto = await this.prisma.productoServicio.findUnique({
        where: { id_producto: Number(item.id_producto) },
      });
      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${item.id_producto} no encontrado`,
        );
      }

      const subtotal_item = new Decimal(item.cantidad).mul(
        item.precio_unitario,
      );
      const igv_item = subtotal_item.mul(
        new Decimal(item.igv_porcentaje).div(100),
      );

      subtotal = subtotal.add(subtotal_item);
      igv = igv.add(igv_item);
    }

    total = subtotal.add(igv);

    // Crear la factura
    return this.prisma.factura.create({
      data: {
        orden_venta: {
          connect: { id_orden_venta: Number(id_orden_venta) },
        },
        numero_factura: rest.numero_factura,
        fecha_emision: rest.fecha_emision,
        subtotal,
        descuento,
        igv,
        total,
        estado: rest.estado,
        notas: rest.observaciones,
      },
      include: {
        orden_venta: true,
      },
    });
  }

  async findAll() {
    return this.prisma.factura.findMany({
      include: {
        orden_venta: true,
      },
    });
  }

  async findOne(id: number) {
    const factura = await this.prisma.factura.findUnique({
      where: { id_factura: id },
      include: {
        orden_venta: true,
      },
    });

    if (!factura) {
      throw new NotFoundException(`Factura con ID ${id} no encontrada`);
    }

    return factura;
  }

  async update(id: number, updateFacturaDto: UpdateFacturaDto) {
    const facturaExistente = await this.prisma.factura.findUnique({
      where: { id_factura: id },
    });

    if (!facturaExistente) {
      throw new NotFoundException(`Factura con ID ${id} no encontrada`);
    }

    if (facturaExistente.estado === 'ANULADA') {
      throw new BadRequestException(
        'No se puede modificar una factura anulada',
      );
    }

    const { items, ...rest } = updateFacturaDto;

    // Si hay nuevos items, recalcular totales
    let subtotal = new Decimal(0);
    let descuento = new Decimal(0);
    let igv = new Decimal(0);
    let total = new Decimal(0);

    if (items) {
      for (const item of items) {
        const producto = await this.prisma.productoServicio.findUnique({
          where: { id_producto: Number(item.id_producto) },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto con ID ${item.id_producto} no encontrado`,
          );
        }

        const subtotal_item = new Decimal(item.cantidad).mul(
          item.precio_unitario,
        );
        const igv_item = subtotal_item.mul(
          new Decimal(item.igv_porcentaje).div(100),
        );

        subtotal = subtotal.add(subtotal_item);
        igv = igv.add(igv_item);
      }

      total = subtotal.add(igv);
    }

    // Actualizar la factura
    return this.prisma.factura.update({
      where: { id_factura: id },
      data: {
        numero_factura: rest.numero_factura,
        fecha_emision: rest.fecha_emision,
        subtotal,
        descuento,
        igv,
        total,
        estado: rest.estado,
        notas: rest.observaciones,
      },
      include: {
        orden_venta: true,
      },
    });
  }

  async remove(id: number) {
    const factura = await this.prisma.factura.findUnique({
      where: { id_factura: id },
    });

    if (!factura) {
      throw new NotFoundException(`Factura con ID ${id} no encontrada`);
    }

    if (factura.estado === 'ANULADA') {
      throw new BadRequestException('No se puede eliminar una factura anulada');
    }

    return this.prisma.factura.delete({
      where: { id_factura: id },
      include: {
        orden_venta: true,
      },
    });
  }
}
