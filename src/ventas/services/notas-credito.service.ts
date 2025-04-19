import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotaCreditoDto } from '../dto/create-nota-credito.dto';
import { UpdateNotaCreditoDto } from '../dto/update-nota-credito.dto';

@Injectable()
export class NotasCreditoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createNotaCreditoDto: CreateNotaCreditoDto) {
    // Verificar que la factura existe y pertenece a la empresa
    const factura = await this.prisma.factura.findFirst({
      where: {
        id_factura: createNotaCreditoDto.id_factura,
        orden_venta: {
          id_empresa: empresaId,
        },
      },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Generar número de nota de crédito
    const ultimaNota = await this.prisma.notaCredito.findFirst({
      where: {
        factura: {
          orden_venta: {
            id_empresa: empresaId,
          },
        },
      },
      orderBy: {
        id_nota_credito: 'desc',
      },
    });

    const numeroNota = ultimaNota
      ? this.generarSiguienteNumeroNota(ultimaNota.numero_nota)
      : this.generarPrimerNumeroNota(empresaId);

    // Calcular totales
    let subtotal = 0;
    let igv = 0;
    let total = 0;

    for (const item of createNotaCreditoDto.items) {
      const itemSubtotal = item.cantidad * item.precio_unitario;
      const itemIgv = itemSubtotal * (item.igv_porcentaje / 100);
      subtotal += itemSubtotal;
      igv += itemIgv;
    }
    total = subtotal + igv;

    // Crear la nota de crédito
    const notaCredito = await this.prisma.notaCredito.create({
      data: {
        id_factura: createNotaCreditoDto.id_factura,
        numero_nota: numeroNota,
        fecha_emision: new Date(),
        motivo: createNotaCreditoDto.motivo,
        monto: total,
        estado: 'EMITIDA',
        items: {
          create: createNotaCreditoDto.items.map((item) => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            igv_porcentaje: item.igv_porcentaje,
            subtotal: item.cantidad * item.precio_unitario,
            igv:
              item.cantidad *
              item.precio_unitario *
              (item.igv_porcentaje / 100),
            total:
              item.cantidad *
              item.precio_unitario *
              (1 + item.igv_porcentaje / 100),
          })),
        },
      },
      include: {
        factura: {
          include: {
            orden_venta: {
              include: {
                items: true,
                cliente: true,
              },
            },
          },
        },
        items: true,
      },
    });

    return notaCredito;
  }

  async findAll(empresaId: number) {
    return this.prisma.notaCredito.findMany({
      where: {
        factura: {
          orden_venta: {
            id_empresa: empresaId,
          },
        },
      },
      include: {
        factura: {
          include: {
            orden_venta: {
              include: {
                items: true,
                cliente: true,
              },
            },
          },
        },
        items: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const notaCredito = await this.prisma.notaCredito.findFirst({
      where: {
        id_nota_credito: id,
        factura: {
          orden_venta: {
            id_empresa: empresaId,
          },
        },
      },
      include: {
        factura: {
          include: {
            orden_venta: {
              include: {
                items: true,
                cliente: true,
              },
            },
          },
        },
        items: true,
      },
    });

    if (!notaCredito) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }

    return notaCredito;
  }

  async update(
    id: number,
    empresaId: number,
    updateNotaCreditoDto: UpdateNotaCreditoDto,
  ) {
    await this.findOne(id, empresaId);

    // Solo se puede actualizar el estado y el motivo
    return this.prisma.notaCredito.update({
      where: { id_nota_credito: id },
      data: {
        estado: updateNotaCreditoDto.estado,
        motivo: updateNotaCreditoDto.motivo,
      },
      include: {
        factura: {
          include: {
            orden_venta: {
              include: {
                items: true,
                cliente: true,
              },
            },
          },
        },
        items: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const notaCredito = await this.findOne(id, empresaId);

    // Verificar si la nota de crédito ya está anulada
    if (notaCredito.estado === 'ANULADA') {
      throw new BadRequestException(
        'No se puede eliminar una nota de crédito anulada',
      );
    }

    // Eliminar la nota de crédito
    await this.prisma.notaCredito.delete({
      where: { id_nota_credito: id },
    });

    return { message: 'Nota de crédito eliminada correctamente' };
  }

  // Métodos auxiliares para generar números de nota de crédito
  private generarPrimerNumeroNota(empresaId: number): string {
    // Formato: NC001-00000001
    return `NC001-00000001`;
  }

  private generarSiguienteNumeroNota(ultimoNumero: string): string {
    // Extraer la parte numérica
    const partes = ultimoNumero.split('-');
    if (partes.length !== 2) {
      return this.generarPrimerNumeroNota(0);
    }

    const serie = partes[0];
    const numero = parseInt(partes[1], 10);

    // Incrementar el número
    const nuevoNumero = numero + 1;

    // Formatear con ceros a la izquierda
    const nuevoNumeroFormateado = nuevoNumero.toString().padStart(8, '0');

    return `${serie}-${nuevoNumeroFormateado}`;
  }
}
