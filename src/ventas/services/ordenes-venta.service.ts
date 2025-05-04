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

  async create(empresaId: number, createOrdenVentaDto: CreateOrdenVentaDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar que el cliente existe y pertenece a la empresa
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: createOrdenVentaDto.id_cliente,
        empresas: {
          some: {
            empresa_id: empresaId,
          },
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Verificar que la cotización existe y pertenece a la empresa
    if (createOrdenVentaDto.id_cotizacion) {
      const cotizacion = await this.prisma.cotizacion.findFirst({
        where: {
          id_cotizacion: createOrdenVentaDto.id_cotizacion,
          empresa: {
            id_empresa: empresaId,
          },
        },
      });
      if (!cotizacion) {
        throw new NotFoundException('Cotización no encontrada');
      }
      if (cotizacion.estado !== 'PENDIENTE') {
        throw new BadRequestException(
          'La cotización debe estar en estado pendiente',
        );
      }
    }

    // Verificar que los productos existen y pertenecen a la empresa
    for (const item of createOrdenVentaDto.items) {
      const producto = await this.prisma.productoServicio.findFirst({
        where: {
          id_producto: item.id_producto,
          id_empresa: empresaId,
        },
      });
      if (!producto) {
        throw new NotFoundException(
          `Producto ${item.id_producto} no encontrado`,
        );
      }
    }

    // Calcular totales
    let subtotal = new Decimal(0);
    let descuento = new Decimal(0);

    for (const item of createOrdenVentaDto.items) {
      const itemSubtotal = new Decimal(item.cantidad).mul(item.precio_unitario);
      subtotal = subtotal.add(itemSubtotal);

      if (item.descuento) {
        descuento = descuento.add(new Decimal(item.descuento));
      }
    }

    const igv = subtotal.sub(descuento).mul(0.19); // 19% IGV
    const total = subtotal.sub(descuento).add(igv);

    // Crear la orden de venta
    return this.prisma.ordenVenta.create({
      data: {
        id_empresa: empresaId,
        id_cliente: createOrdenVentaDto.id_cliente,
        id_cotizacion: createOrdenVentaDto.id_cotizacion,
        fecha_emision: new Date(),
        estado: 'PENDIENTE',
        subtotal,
        descuento,
        igv,
        total,
        items: {
          create: createOrdenVentaDto.items.map((item) => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: new Decimal(item.precio_unitario),
            descuento: item.descuento
              ? new Decimal(item.descuento)
              : new Decimal(0),
            subtotal: new Decimal(item.cantidad)
              .mul(item.precio_unitario)
              .sub(
                item.descuento ? new Decimal(item.descuento) : new Decimal(0),
              ),
          })),
        },
      },
      include: {
        items: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.ordenVenta.findMany({
      where: {
        empresa: {
          id_empresa: empresaId,
        },
      },
      include: {
        items: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const orden = await this.prisma.ordenVenta.findFirst({
      where: {
        id_orden_venta: id,
        empresa: {
          id_empresa: empresaId,
        },
      },
      include: {
        items: true,
        cliente: true,
        cotizacion: true,
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de venta no encontrada');
    }

    return orden;
  }

  async update(
    id: number,
    empresaId: number,
    updateOrdenVentaDto: UpdateOrdenVentaDto,
  ) {
    const orden = await this.findOne(id, empresaId);

    if (orden.estado === 'FACTURADA') {
      throw new BadRequestException(
        'No se puede modificar una orden de venta facturada',
      );
    }

    // Verificar que los productos existen y pertenecen a la empresa
    if (updateOrdenVentaDto.items) {
      for (const item of updateOrdenVentaDto.items) {
        const producto = await this.prisma.productoServicio.findFirst({
          where: {
            id_producto: item.id_producto,
            id_empresa: empresaId,
          },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto ${item.id_producto} no encontrado`,
          );
        }
      }
    }

    // Calcular totales si hay cambios en los items
    let subtotal = orden.subtotal;
    let descuento = orden.descuento;

    if (updateOrdenVentaDto.items) {
      subtotal = new Decimal(0);
      descuento = new Decimal(0);

      for (const item of updateOrdenVentaDto.items) {
        const itemSubtotal = new Decimal(item.cantidad).mul(
          item.precio_unitario,
        );
        subtotal = subtotal.add(itemSubtotal);

        if (item.descuento) {
          descuento = descuento.add(new Decimal(item.descuento));
        }
      }
    }

    const igv = subtotal.sub(descuento).mul(0.19);
    const total = subtotal.sub(descuento).add(igv);

    // Actualizar la orden
    return this.prisma.ordenVenta.update({
      where: { id_orden_venta: id },
      data: {
        ...updateOrdenVentaDto,
        subtotal,
        descuento,
        igv,
        total,
        items: updateOrdenVentaDto.items
          ? {
              deleteMany: {},
              create: updateOrdenVentaDto.items.map((item) => ({
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: new Decimal(item.precio_unitario),
                descuento: item.descuento
                  ? new Decimal(item.descuento)
                  : new Decimal(0),
                subtotal: new Decimal(item.cantidad)
                  .mul(item.precio_unitario)
                  .sub(
                    item.descuento
                      ? new Decimal(item.descuento)
                      : new Decimal(0),
                  ),
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const orden = await this.findOne(id, empresaId);

    if (orden.estado === 'FACTURADA') {
      throw new BadRequestException(
        'No se puede eliminar una orden de venta facturada',
      );
    }

    return this.prisma.ordenVenta.delete({
      where: {
        id_orden_venta: id,
      },
    });
  }

  async aprobar(empresaId: number, id: number) {
    const orden = await this.findOne(id, empresaId);

    if (orden.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden aprobar órdenes en estado pendiente',
      );
    }

    return this.prisma.ordenVenta.update({
      where: {
        id_orden_venta: id,
      },
      data: {
        estado: 'APROBADA',
      },
      include: {
        items: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }

  async cancelar(empresaId: number, id: number) {
    const orden = await this.findOne(id, empresaId);

    if (orden.estado === 'FACTURADA') {
      throw new BadRequestException(
        'No se puede cancelar una orden de venta facturada',
      );
    }

    return this.prisma.ordenVenta.update({
      where: {
        id_orden_venta: id,
      },
      data: {
        estado: 'CANCELADA',
      },
      include: {
        items: true,
        cliente: true,
        cotizacion: true,
      },
    });
  }
}
