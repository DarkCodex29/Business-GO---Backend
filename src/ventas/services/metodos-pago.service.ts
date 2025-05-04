import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMetodoPagoDto } from '../dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from '../dto/update-metodo-pago.dto';

@Injectable()
export class MetodosPagoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createMetodoPagoDto: CreateMetodoPagoDto) {
    // El parámetro empresaId se incluye para mantener la consistencia con otros servicios
    // aunque el modelo MetodoPago no tiene relación directa con la empresa
    return this.prisma.metodoPago.create({
      data: {
        nombre: createMetodoPagoDto.nombre,
        descripcion: createMetodoPagoDto.descripcion,
        tipo_pago: createMetodoPagoDto.tipo_pago,
        tiene_comision: createMetodoPagoDto.tiene_comision,
        porcentaje_comision: createMetodoPagoDto.porcentaje_comision,
      },
    });
  }

  findAll(empresaId: number) {
    // El parámetro empresaId se incluye para mantener la consistencia con otros servicios
    return this.prisma.metodoPago.findMany({
      include: {
        pagos: true,
      },
    });
  }

  findOne(empresaId: number, id: number) {
    // El parámetro empresaId se incluye para mantener la consistencia con otros servicios
    return this.prisma.metodoPago.findUnique({
      where: { id_metodo_pago: id },
      include: {
        pagos: true,
      },
    });
  }

  async update(
    empresaId: number,
    id: number,
    updateMetodoPagoDto: UpdateMetodoPagoDto,
  ) {
    // El parámetro empresaId se incluye para mantener la consistencia con otros servicios
    // Verificar si existe el método de pago
    const metodoPago = await this.prisma.metodoPago.findUnique({
      where: { id_metodo_pago: id },
    });

    if (!metodoPago) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    return this.prisma.metodoPago.update({
      where: { id_metodo_pago: id },
      data: {
        nombre: updateMetodoPagoDto.nombre,
        descripcion: updateMetodoPagoDto.descripcion,
        tipo_pago: updateMetodoPagoDto.tipo_pago,
        tiene_comision: updateMetodoPagoDto.tiene_comision,
        porcentaje_comision: updateMetodoPagoDto.porcentaje_comision,
      },
      include: {
        pagos: true,
      },
    });
  }

  async remove(empresaId: number, id: number) {
    // El parámetro empresaId se incluye para mantener la consistencia con otros servicios
    // Verificar si existe el método de pago
    const metodoPago = await this.prisma.metodoPago.findUnique({
      where: { id_metodo_pago: id },
    });

    if (!metodoPago) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    // Verificar si tiene pagos asociados
    const pagos = await this.prisma.pago.findMany({
      where: { id_metodo_pago: id },
    });

    if (pagos.length > 0) {
      throw new Error(
        'No se puede eliminar un método de pago con pagos asociados',
      );
    }

    return this.prisma.metodoPago.delete({
      where: { id_metodo_pago: id },
    });
  }
}
