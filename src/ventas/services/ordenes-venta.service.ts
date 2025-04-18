import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrdenVentaDto } from '../dto/create-orden-venta.dto';
import { UpdateOrdenVentaDto } from '../dto/update-orden-venta.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdenesVentaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrdenVentaDto: CreateOrdenVentaDto) {
    const { id_empresa, id_cliente, id_cotizacion, items, ...rest } =
      createOrdenVentaDto;

    // Validar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: Number(id_empresa) },
    });
    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${id_empresa} no encontrada`);
    }

    // Validar que el cliente existe
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: Number(id_cliente) },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id_cliente} no encontrado`);
    }

    // Si hay cotización, validar que existe y está pendiente
    if (id_cotizacion) {
      const cotizacion = await this.prisma.cotizacion.findUnique({
        where: { id_cotizacion: Number(id_cotizacion) },
      });
      if (!cotizacion) {
        throw new NotFoundException(
          `Cotización con ID ${id_cotizacion} no encontrada`,
        );
      }
      if (cotizacion.estado !== 'pendiente') {
        throw new BadRequestException(
          'La cotización debe estar en estado pendiente',
        );
      }
    }

    // Validar productos y calcular totales
    let subtotal = new Decimal(0);
    let descuento = new Decimal(0);
    let igv = new Decimal(0);

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
      const descuento_item = new Decimal(item.descuento ?? 0);

      subtotal = subtotal.add(subtotal_item);
      descuento = descuento.add(descuento_item);
    }

    igv = subtotal.sub(descuento).mul(0.18); // 18% IGV
    const total = subtotal.sub(descuento).add(igv);

    // Crear la orden de venta con sus items
    return this.prisma.ordenVenta.create({
      data: {
        id_empresa: Number(id_empresa),
        id_cliente: Number(id_cliente),
        id_cotizacion: id_cotizacion ? Number(id_cotizacion) : null,
        ...rest,
        subtotal,
        descuento,
        igv,
        total,
        items: {
          create: items.map((item) => ({
            id_producto: Number(item.id_producto),
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            descuento: item.descuento ?? 0,
            subtotal: new Decimal(item.cantidad)
              .mul(item.precio_unitario)
              .sub(item.descuento ?? 0),
          })),
        },
      },
      include: {
        items: true,
        empresa: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async findAll() {
    return this.prisma.ordenVenta.findMany({
      include: {
        items: true,
        empresa: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async findOne(id: number) {
    const ordenVenta = await this.prisma.ordenVenta.findUnique({
      where: { id_orden_venta: id },
      include: {
        items: true,
        empresa: true,
        cliente: true,
        cotizacion: true,
      },
    });

    if (!ordenVenta) {
      throw new NotFoundException(`Orden de venta con ID ${id} no encontrada`);
    }

    return ordenVenta;
  }

  async update(id: number, updateOrdenVentaDto: UpdateOrdenVentaDto) {
    const ordenVentaExistente = await this.prisma.ordenVenta.findUnique({
      where: { id_orden_venta: id },
      include: { items: true },
    });

    if (!ordenVentaExistente) {
      throw new NotFoundException(`Orden de venta con ID ${id} no encontrada`);
    }

    if (ordenVentaExistente.estado === 'FACTURADA') {
      throw new BadRequestException(
        'No se puede modificar una orden de venta facturada',
      );
    }

    const { items, ...rest } = updateOrdenVentaDto;

    // Si hay nuevos items, recalcular totales
    let subtotal = ordenVentaExistente.subtotal;
    let descuento = ordenVentaExistente.descuento;
    let igv = ordenVentaExistente.igv;

    if (items) {
      subtotal = new Decimal(0);
      descuento = new Decimal(0);

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
        const descuento_item = new Decimal(item.descuento ?? 0);

        subtotal = subtotal.add(subtotal_item);
        descuento = descuento.add(descuento_item);
      }

      igv = subtotal.sub(descuento).mul(0.18);
    }

    const total = subtotal.sub(descuento).add(igv);

    // Actualizar la orden de venta
    return this.prisma.ordenVenta.update({
      where: { id_orden_venta: id },
      data: {
        ...rest,
        subtotal,
        descuento,
        igv,
        total,
        items: items
          ? {
              deleteMany: {},
              create: items.map((item) => ({
                id_producto: Number(item.id_producto),
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                descuento: item.descuento ?? 0,
                subtotal: new Decimal(item.cantidad)
                  .mul(item.precio_unitario)
                  .sub(item.descuento ?? 0),
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        empresa: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async remove(id: number) {
    const ordenVenta = await this.prisma.ordenVenta.findUnique({
      where: { id_orden_venta: id },
    });

    if (!ordenVenta) {
      throw new NotFoundException(`Orden de venta con ID ${id} no encontrada`);
    }

    if (ordenVenta.estado === 'FACTURADA') {
      throw new BadRequestException(
        'No se puede eliminar una orden de venta facturada',
      );
    }

    return this.prisma.ordenVenta.delete({
      where: { id_orden_venta: id },
      include: {
        items: true,
        empresa: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }
}
