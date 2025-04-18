import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCotizacionDto } from '../dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from '../dto/update-cotizacion.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CotizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCotizacionDto: CreateCotizacionDto) {
    const { id_empresa, id_cliente, items, ...rest } = createCotizacionDto;

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
      const descuento_item = subtotal_item.mul(
        new Decimal(item.descuento).div(100),
      );

      subtotal = subtotal.add(subtotal_item);
      descuento = descuento.add(descuento_item);
    }

    igv = subtotal.sub(descuento).mul(new Decimal(0.18));
    total = subtotal.sub(descuento).add(igv);

    // Crear la cotización con sus items
    return this.prisma.cotizacion.create({
      data: {
        empresa: {
          connect: { id_empresa: Number(id_empresa) },
        },
        cliente: {
          connect: { id_cliente: Number(id_cliente) },
        },
        fecha_emision: rest.fecha_emision,
        fecha_validez: rest.fecha_validez,
        subtotal,
        descuento,
        igv,
        total,
        estado: rest.estado,
        notas: rest.notas,
        items: {
          create: items.map((item) => {
            const subtotal_item = new Decimal(item.cantidad).mul(
              item.precio_unitario,
            );
            const descuento_item = subtotal_item.mul(
              new Decimal(item.descuento).div(100),
            );
            return {
              id_producto: Number(item.id_producto),
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              descuento: item.descuento,
              subtotal: subtotal_item.sub(descuento_item),
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });
  }

  async findAll() {
    return this.prisma.cotizacion.findMany({
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });
  }

  async findOne(id: number) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  async update(id: number, updateCotizacionDto: UpdateCotizacionDto) {
    const cotizacionExistente = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
    });

    if (!cotizacionExistente) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    if (cotizacionExistente.estado === 'CONVERTIDA') {
      throw new BadRequestException(
        'No se puede modificar una cotización convertida en orden de venta',
      );
    }

    const { items, ...rest } = updateCotizacionDto;

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
        const descuento_item = subtotal_item.mul(
          new Decimal(item.descuento).div(100),
        );

        subtotal = subtotal.add(subtotal_item);
        descuento = descuento.add(descuento_item);
      }

      igv = subtotal.sub(descuento).mul(new Decimal(0.18));
      total = subtotal.sub(descuento).add(igv);
    }

    // Actualizar la cotización
    return this.prisma.cotizacion.update({
      where: { id_cotizacion: id },
      data: {
        fecha_emision: rest.fecha_emision,
        fecha_validez: rest.fecha_validez,
        subtotal,
        descuento,
        igv,
        total,
        estado: rest.estado,
        notas: rest.notas,
        items: items
          ? {
              deleteMany: {},
              create: items.map((item) => {
                const subtotal_item = new Decimal(item.cantidad).mul(
                  item.precio_unitario,
                );
                const descuento_item = subtotal_item.mul(
                  new Decimal(item.descuento).div(100),
                );
                return {
                  id_producto: Number(item.id_producto),
                  cantidad: item.cantidad,
                  precio_unitario: item.precio_unitario,
                  descuento: item.descuento,
                  subtotal: subtotal_item.sub(descuento_item),
                };
              }),
            }
          : undefined,
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });
  }

  async remove(id: number) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    if (cotizacion.estado === 'CONVERTIDA') {
      throw new BadRequestException(
        'No se puede eliminar una cotización convertida en orden de venta',
      );
    }

    return this.prisma.cotizacion.delete({
      where: { id_cotizacion: id },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });
  }
}
