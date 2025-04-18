import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotaCreditoDto } from '../dto/create-nota-credito.dto';
import { UpdateNotaCreditoDto } from '../dto/update-nota-credito.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class NotasCreditoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNotaCreditoDto: CreateNotaCreditoDto) {
    const { id_factura, items, ...rest } = createNotaCreditoDto;

    // Validar que la factura existe
    const factura = await this.prisma.factura.findUnique({
      where: { id_factura: Number(id_factura) },
      include: {
        orden_venta: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!factura) {
      throw new NotFoundException(`Factura con ID ${id_factura} no encontrada`);
    }

    // Validar productos y calcular totales
    let monto = new Decimal(0);

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
      monto = monto.add(subtotal_item).add(igv_item);
    }

    // Crear la nota de crédito
    return this.prisma.notaCredito.create({
      data: {
        factura: {
          connect: { id_factura: Number(id_factura) },
        },
        numero_nota: rest.numero_nota,
        fecha_emision: rest.fecha_emision,
        motivo: rest.motivo,
        monto,
        estado: rest.estado,
      },
      include: {
        factura: true,
      },
    });
  }

  async findAll() {
    return this.prisma.notaCredito.findMany({
      include: {
        factura: true,
      },
    });
  }

  async findOne(id: number) {
    const notaCredito = await this.prisma.notaCredito.findUnique({
      where: { id_nota_credito: id },
      include: {
        factura: true,
      },
    });

    if (!notaCredito) {
      throw new NotFoundException(`Nota de crédito con ID ${id} no encontrada`);
    }

    return notaCredito;
  }

  async update(id: number, updateNotaCreditoDto: UpdateNotaCreditoDto) {
    const notaCreditoExistente = await this.prisma.notaCredito.findUnique({
      where: { id_nota_credito: id },
    });

    if (!notaCreditoExistente) {
      throw new NotFoundException(`Nota de crédito con ID ${id} no encontrada`);
    }

    if (
      notaCreditoExistente.estado === 'APLICADA' ||
      notaCreditoExistente.estado === 'ANULADA'
    ) {
      throw new BadRequestException(
        'No se puede modificar una nota de crédito aplicada o anulada',
      );
    }

    const { items, ...rest } = updateNotaCreditoDto;

    // Si hay nuevos items, recalcular totales
    let monto = notaCreditoExistente.monto;

    if (items) {
      monto = new Decimal(0);
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
        monto = monto.add(subtotal_item).add(igv_item);
      }
    }

    // Actualizar la nota de crédito
    return this.prisma.notaCredito.update({
      where: { id_nota_credito: id },
      data: {
        numero_nota: rest.numero_nota,
        fecha_emision: rest.fecha_emision,
        motivo: rest.motivo,
        monto,
        estado: rest.estado,
      },
      include: {
        factura: true,
      },
    });
  }

  async remove(id: number) {
    const notaCredito = await this.prisma.notaCredito.findUnique({
      where: { id_nota_credito: id },
    });

    if (!notaCredito) {
      throw new NotFoundException(`Nota de crédito con ID ${id} no encontrada`);
    }

    if (notaCredito.estado === 'APLICADA') {
      throw new BadRequestException(
        'No se puede eliminar una nota de crédito aplicada',
      );
    }

    return this.prisma.notaCredito.delete({
      where: { id_nota_credito: id },
      include: {
        factura: true,
      },
    });
  }
}
