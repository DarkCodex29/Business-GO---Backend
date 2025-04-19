import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrdenCompraDto } from '../dto/create-orden-compra.dto';
import { CreateFacturaCompraDto } from '../dto/create-factura-compra.dto';
import { CreatePagoCompraDto } from '../dto/create-pago-compra.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdenesCompraService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrdenCompraDto: CreateOrdenCompraDto, empresaId: number) {
    const { items, ...ordenData } = createOrdenCompraDto;

    // Calcular subtotal, IGV y total
    const subtotal = new Prisma.Decimal(
      items.reduce(
        (acc, item) =>
          acc + Number(item.cantidad) * Number(item.precio_unitario),
        0,
      ),
    );
    const igv = new Prisma.Decimal(Number(subtotal) * 0.18); // 18% IGV
    const total = new Prisma.Decimal(Number(subtotal) + Number(igv));

    // Crear la orden de compra con sus items en una transacción
    return this.prisma.$transaction(async (prisma) => {
      const ordenCompra = await prisma.ordenCompra.create({
        data: {
          ...ordenData,
          id_empresa: empresaId,
          subtotal,
          igv,
          total,
          items: {
            create: items.map((item) => ({
              id_producto: item.id_producto,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              subtotal: new Prisma.Decimal(
                Number(item.cantidad) * Number(item.precio_unitario),
              ),
              fecha_entrega: item.fecha_entrega,
            })),
          },
        },
        include: {
          items: true,
          proveedor: true,
        },
      });

      return ordenCompra;
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.ordenCompra.findMany({
      where: {
        id_empresa: empresaId,
      },
      include: {
        items: true,
        proveedor: true,
        facturas: true,
      },
      orderBy: {
        fecha_emision: 'desc',
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const ordenCompra = await this.prisma.ordenCompra.findFirst({
      where: {
        id_orden_compra: id,
        id_empresa: empresaId,
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        proveedor: true,
        facturas: {
          include: {
            pagos: true,
          },
        },
      },
    });

    if (!ordenCompra) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada`);
    }

    return ordenCompra;
  }

  async update(
    id: number,
    updateOrdenCompraDto: Partial<CreateOrdenCompraDto>,
    empresaId: number,
  ) {
    const ordenActual = await this.findOne(id, empresaId);
    const { items, ...ordenData } = updateOrdenCompraDto;

    // Si hay items, recalcular totales
    let subtotal = ordenActual.subtotal;
    let igv = ordenActual.igv;
    let total = ordenActual.total;

    if (items && items.length > 0) {
      subtotal = new Prisma.Decimal(
        items.reduce(
          (acc, item) =>
            acc + Number(item.cantidad) * Number(item.precio_unitario),
          0,
        ),
      );
      igv = new Prisma.Decimal(Number(subtotal) * 0.18);
      total = new Prisma.Decimal(Number(subtotal) + Number(igv));
    }

    return this.prisma.$transaction(async (prisma) => {
      // Actualizar la orden
      const ordenActualizada = await prisma.ordenCompra.update({
        where: {
          id_orden_compra: id,
        },
        data: {
          ...ordenData,
          subtotal,
          igv,
          total,
        },
        include: {
          items: true,
          proveedor: true,
        },
      });

      // Si hay items, actualizar o crear nuevos
      if (items && items.length > 0) {
        // Eliminar items existentes
        await prisma.itemOrdenCompra.deleteMany({
          where: {
            id_orden_compra: id,
          },
        });

        // Crear nuevos items
        await prisma.itemOrdenCompra.createMany({
          data: items.map((item) => ({
            id_orden_compra: id,
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: new Prisma.Decimal(
              Number(item.cantidad) * Number(item.precio_unitario),
            ),
            fecha_entrega: item.fecha_entrega,
          })),
        });
      }

      return ordenActualizada;
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.ordenCompra.update({
      where: {
        id_orden_compra: id,
      },
      data: {
        estado: 'cancelada',
      },
    });
  }

  async addFactura(
    id: number,
    facturaData: CreateFacturaCompraDto,
    empresaId: number,
  ) {
    await this.findOne(id, empresaId);

    return this.prisma.facturaCompra.create({
      data: {
        ...facturaData,
        id_orden_compra: id,
      },
      include: {
        orden_compra: true,
      },
    });
  }

  async addPago(
    idFactura: number,
    pagoData: CreatePagoCompraDto,
    empresaId: number,
  ) {
    const factura = await this.prisma.facturaCompra.findFirst({
      where: {
        id_factura_compra: idFactura,
        orden_compra: {
          id_empresa: empresaId,
        },
      },
    });

    if (!factura) {
      throw new NotFoundException(`Factura con ID ${idFactura} no encontrada`);
    }

    return this.prisma.pagoCompra.create({
      data: {
        ...pagoData,
        id_factura_compra: idFactura,
      },
      include: {
        factura_compra: true,
      },
    });
  }
}
