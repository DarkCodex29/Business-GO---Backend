import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFacturaDto } from '../dto/create-factura.dto';
import { UpdateFacturaDto } from '../dto/update-factura.dto';

@Injectable()
export class FacturasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createFacturaDto: CreateFacturaDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar que la orden de venta existe y pertenece a la empresa
    const ordenVenta = await this.prisma.ordenVenta.findFirst({
      where: {
        id_orden_venta: createFacturaDto.id_orden_venta,
        empresa: {
          id_empresa: empresaId,
        },
      },
      include: {
        items: true,
        cliente: true,
      },
    });
    if (!ordenVenta) {
      throw new NotFoundException('Orden de venta no encontrada');
    }

    // Verificar que la orden de venta no esté ya facturada
    if (ordenVenta.estado === 'FACTURADA') {
      throw new BadRequestException('La orden de venta ya está facturada');
    }

    // Generar número de factura
    const ultimaFactura = await this.prisma.factura.findFirst({
      where: {
        orden_venta: {
          empresa: {
            id_empresa: empresaId,
          },
        },
      },
      orderBy: {
        id_factura: 'desc',
      },
    });

    const numeroFactura = ultimaFactura
      ? this.generarSiguienteNumeroFactura(ultimaFactura.numero_factura)
      : this.generarPrimerNumeroFactura(empresaId);

    // Crear la factura
    const factura = await this.prisma.factura.create({
      data: {
        id_orden_venta: createFacturaDto.id_orden_venta,
        numero_factura: numeroFactura,
        fecha_emision: new Date(),
        subtotal: ordenVenta.subtotal,
        descuento: ordenVenta.descuento,
        igv: ordenVenta.igv,
        total: ordenVenta.total,
        estado: 'EMITIDA',
        notas: createFacturaDto.notas,
      },
      include: {
        orden_venta: {
          include: {
            items: true,
            cliente: true,
          },
        },
        notas_credito: true,
        notas_debito: true,
      },
    });

    // Actualizar el estado de la orden de venta
    await this.prisma.ordenVenta.update({
      where: { id_orden_venta: createFacturaDto.id_orden_venta },
      data: { estado: 'FACTURADA' },
    });

    return factura;
  }

  async findAll(empresaId: number) {
    return this.prisma.factura.findMany({
      where: {
        orden_venta: {
          empresa: {
            id_empresa: empresaId,
          },
        },
      },
      include: {
        orden_venta: {
          include: {
            items: true,
            cliente: true,
          },
        },
        notas_credito: true,
        notas_debito: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const factura = await this.prisma.factura.findFirst({
      where: {
        id_factura: id,
        orden_venta: {
          empresa: {
            id_empresa: empresaId,
          },
        },
      },
      include: {
        orden_venta: {
          include: {
            items: true,
            cliente: true,
          },
        },
        notas_credito: true,
        notas_debito: true,
      },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return factura;
  }

  async update(
    id: number,
    empresaId: number,
    updateFacturaDto: UpdateFacturaDto,
  ) {
    await this.findOne(id, empresaId);

    // Solo se puede actualizar el estado y las notas
    return this.prisma.factura.update({
      where: { id_factura: id },
      data: {
        estado: updateFacturaDto.estado,
        notas: updateFacturaDto.notas,
      },
      include: {
        orden_venta: {
          include: {
            items: true,
            cliente: true,
          },
        },
        notas_credito: true,
        notas_debito: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const factura = await this.findOne(id, empresaId);

    // Verificar si la factura tiene notas de crédito o débito
    if (factura.notas_credito.length > 0 || factura.notas_debito.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una factura con notas de crédito o débito asociadas',
      );
    }

    // Eliminar la factura
    await this.prisma.factura.delete({
      where: { id_factura: id },
    });

    // Actualizar el estado de la orden de venta
    await this.prisma.ordenVenta.update({
      where: { id_orden_venta: factura.id_orden_venta },
      data: { estado: 'PENDIENTE' },
    });

    return { message: 'Factura eliminada correctamente' };
  }

  // Métodos auxiliares para generar números de factura
  private generarPrimerNumeroFactura(empresaId: number): string {
    // Formato: F001-00000001
    return `F001-00000001`;
  }

  private generarSiguienteNumeroFactura(ultimoNumero: string): string {
    // Extraer la parte numérica
    const partes = ultimoNumero.split('-');
    if (partes.length !== 2) {
      return this.generarPrimerNumeroFactura(0);
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
