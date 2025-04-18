import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotaDebitoDto } from '../dto/create-nota-debito.dto';
import { UpdateNotaDebitoDto } from '../dto/update-nota-debito.dto';

@Injectable()
export class NotasDebitoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNotaDebitoDto: CreateNotaDebitoDto) {
    // Validar que la factura existe
    const factura = await this.prisma.factura.findUnique({
      where: { id_factura: createNotaDebitoDto.id_factura },
    });

    if (!factura) {
      throw new NotFoundException('La factura no existe');
    }

    // Validar que los productos existen
    for (const item of createNotaDebitoDto.items) {
      const producto = await this.prisma.productoServicio.findUnique({
        where: { id_producto: item.id_producto },
      });

      if (!producto) {
        throw new NotFoundException(
          `El producto con ID ${item.id_producto} no existe`,
        );
      }
    }

    // Calcular totales
    const subtotal = createNotaDebitoDto.items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0,
    );

    const igv = createNotaDebitoDto.items.reduce(
      (sum, item) =>
        sum +
        (item.cantidad * item.precio_unitario * item.igv_porcentaje) / 100,
      0,
    );

    const total = subtotal + igv;

    // Crear la nota de débito
    return this.prisma.notaDebito.create({
      data: {
        id_factura: createNotaDebitoDto.id_factura,
        numero_nota: createNotaDebitoDto.numero_nota,
        fecha_emision: createNotaDebitoDto.fecha_emision,
        motivo: createNotaDebitoDto.motivo,
        estado: createNotaDebitoDto.estado,
        monto: total,
        items: {
          create: createNotaDebitoDto.items.map((item) => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            igv_porcentaje: item.igv_porcentaje,
            subtotal: item.cantidad * item.precio_unitario,
            igv:
              (item.cantidad * item.precio_unitario * item.igv_porcentaje) /
              100,
            total:
              item.cantidad *
              item.precio_unitario *
              (1 + item.igv_porcentaje / 100),
          })),
        },
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        factura: true,
      },
    });
  }

  findAll() {
    return this.prisma.notaDebito.findMany({
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        factura: true,
      },
    });
  }

  async findOne(id: number) {
    const notaDebito = await this.prisma.notaDebito.findUnique({
      where: { id_nota_debito: id },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        factura: true,
      },
    });

    if (!notaDebito) {
      throw new NotFoundException('Nota de débito no encontrada');
    }

    return notaDebito;
  }

  async update(id: number, updateNotaDebitoDto: UpdateNotaDebitoDto) {
    const notaDebito = await this.findOne(id);

    // Validar que la nota no esté aplicada o cancelada
    if (notaDebito.estado === 'APLICADA' || notaDebito.estado === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede modificar una nota de débito aplicada o cancelada',
      );
    }

    // Si se proporcionan nuevos items, recalcular totales
    let data: any = {};

    if (updateNotaDebitoDto.numero_nota)
      data.numero_nota = updateNotaDebitoDto.numero_nota;
    if (updateNotaDebitoDto.fecha_emision)
      data.fecha_emision = updateNotaDebitoDto.fecha_emision;
    if (updateNotaDebitoDto.motivo) data.motivo = updateNotaDebitoDto.motivo;
    if (updateNotaDebitoDto.estado) data.estado = updateNotaDebitoDto.estado;

    if (updateNotaDebitoDto.items) {
      const subtotal = updateNotaDebitoDto.items.reduce(
        (sum, item) => sum + item.cantidad * item.precio_unitario,
        0,
      );

      const igv = updateNotaDebitoDto.items.reduce(
        (sum, item) =>
          sum +
          (item.cantidad * item.precio_unitario * item.igv_porcentaje) / 100,
        0,
      );

      const total = subtotal + igv;
      data.monto = total;

      data.items = {
        deleteMany: {},
        create: updateNotaDebitoDto.items.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          igv_porcentaje: item.igv_porcentaje,
          subtotal: item.cantidad * item.precio_unitario,
          igv:
            (item.cantidad * item.precio_unitario * item.igv_porcentaje) / 100,
          total:
            item.cantidad *
            item.precio_unitario *
            (1 + item.igv_porcentaje / 100),
        })),
      };
    }

    return this.prisma.notaDebito.update({
      where: { id_nota_debito: id },
      data,
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        factura: true,
      },
    });
  }

  async remove(id: number) {
    const notaDebito = await this.findOne(id);

    // Validar que la nota no esté aplicada
    if (notaDebito.estado === 'APLICADA') {
      throw new BadRequestException(
        'No se puede eliminar una nota de débito aplicada',
      );
    }

    return this.prisma.notaDebito.delete({
      where: { id_nota_debito: id },
    });
  }
}
