import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotaDebitoDto } from '../dto/create-nota-debito.dto';
import { UpdateNotaDebitoDto } from '../dto/update-nota-debito.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class NotasDebitoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createNotaDebitoDto: CreateNotaDebitoDto) {
    // Verificar que la factura existe y pertenece a la empresa
    const factura = await this.prisma.factura.findFirst({
      where: {
        id_factura: createNotaDebitoDto.id_factura,
        orden_venta: {
          id_empresa: empresaId,
        },
      },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Generar número de nota de débito
    const ultimaNota = await this.prisma.notaDebito.findFirst({
      where: {
        factura: {
          orden_venta: {
            id_empresa: empresaId,
          },
        },
      },
      orderBy: { numero_nota: 'desc' },
    });

    const numeroNota = ultimaNota
      ? this.generarSiguienteNumero(ultimaNota.numero_nota)
      : this.generarPrimerNumero();

    // Calcular totales
    let subtotal = new Decimal(0);
    let igv = new Decimal(0);
    let total = new Decimal(0);

    for (const item of createNotaDebitoDto.items) {
      const subtotalItem = new Decimal(item.cantidad).mul(item.precio_unitario);
      const igvItem = subtotalItem.mul(item.igv_porcentaje).div(100);
      subtotal = subtotal.add(subtotalItem);
      igv = igv.add(igvItem);
    }

    total = subtotal.add(igv);

    // Crear la nota de débito
    return this.prisma.notaDebito.create({
      data: {
        id_factura: createNotaDebitoDto.id_factura,
        numero_nota: numeroNota,
        fecha_emision: new Date(),
        motivo: createNotaDebitoDto.motivo,
        monto: total,
        estado: 'EMITIDA',
        items: {
          create: createNotaDebitoDto.items.map((item) => ({
            producto: {
              connect: { id_producto: item.id_producto },
            },
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            igv_porcentaje: item.igv_porcentaje,
            subtotal: new Decimal(item.cantidad).mul(item.precio_unitario),
            igv: new Decimal(item.cantidad)
              .mul(item.precio_unitario)
              .mul(item.igv_porcentaje)
              .div(100),
            total: new Decimal(item.cantidad)
              .mul(item.precio_unitario)
              .mul(new Decimal(1).add(item.igv_porcentaje).div(100)),
          })),
        },
      },
      include: {
        factura: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.notaDebito.findMany({
      where: {
        factura: {
          orden_venta: {
            id_empresa: empresaId,
          },
        },
      },
      include: {
        factura: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });
  }

  async findOne(empresaId: number, id: number) {
    const notaDebito = await this.prisma.notaDebito.findFirst({
      where: {
        id_nota_debito: id,
        factura: {
          orden_venta: {
            id_empresa: empresaId,
          },
        },
      },
      include: {
        factura: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!notaDebito) {
      throw new NotFoundException('Nota de débito no encontrada');
    }

    return notaDebito;
  }

  async update(
    empresaId: number,
    id: number,
    updateNotaDebitoDto: UpdateNotaDebitoDto,
  ) {
    const notaDebito = await this.findOne(empresaId, id);

    if (notaDebito.estado === 'ANULADA') {
      throw new BadRequestException(
        'No se puede modificar una nota de débito anulada',
      );
    }

    return this.prisma.notaDebito.update({
      where: { id_nota_debito: id },
      data: {
        estado: updateNotaDebitoDto.estado,
        motivo: updateNotaDebitoDto.motivo,
      },
      include: {
        factura: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });
  }

  async remove(empresaId: number, id: number) {
    const notaDebito = await this.findOne(empresaId, id);

    if (notaDebito.estado === 'ANULADA') {
      throw new BadRequestException(
        'No se puede eliminar una nota de débito anulada',
      );
    }

    await this.prisma.notaDebito.update({
      where: { id_nota_debito: id },
      data: { estado: 'ANULADA' },
    });

    return { message: 'Nota de débito anulada exitosamente' };
  }

  private generarPrimerNumero(): string {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    return `ND-${año}-0001`;
  }

  private generarSiguienteNumero(ultimoNumero: string): string {
    const [prefijo, año, secuencia] = ultimoNumero.split('-');
    const siguienteSecuencia = (parseInt(secuencia) + 1)
      .toString()
      .padStart(4, '0');
    return `${prefijo}-${año}-${siguienteSecuencia}`;
  }
}
