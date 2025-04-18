import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReembolsoDto } from '../dto/create-reembolso.dto';
import { UpdateReembolsoDto } from '../dto/update-reembolso.dto';

@Injectable()
export class ReembolsosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReembolsoDto: CreateReembolsoDto) {
    // Verificar si el pago existe
    const pago = await this.prisma.pago.findUnique({
      where: { id_pago: createReembolsoDto.id_pago },
    });

    if (!pago) {
      throw new NotFoundException(
        `Pago con ID ${createReembolsoDto.id_pago} no encontrado`,
      );
    }

    // Verificar si el monto del reembolso no excede el monto del pago
    if (Number(createReembolsoDto.monto) > Number(pago.monto)) {
      throw new Error(
        'El monto del reembolso no puede exceder el monto del pago',
      );
    }

    // Crear el reembolso
    return this.prisma.reembolso.create({
      data: {
        id_pago: createReembolsoDto.id_pago,
        monto: createReembolsoDto.monto,
        motivo: createReembolsoDto.motivo,
      },
      include: {
        pago: true,
      },
    });
  }

  async findAll() {
    return this.prisma.reembolso.findMany({
      include: {
        pago: true,
      },
    });
  }

  async findOne(id: number) {
    const reembolso = await this.prisma.reembolso.findUnique({
      where: { id_reembolso: id },
      include: {
        pago: true,
      },
    });

    if (!reembolso) {
      throw new NotFoundException(`Reembolso con ID ${id} no encontrado`);
    }

    return reembolso;
  }

  async update(id: number, updateReembolsoDto: UpdateReembolsoDto) {
    // Verificar si el reembolso existe
    const reembolso = await this.prisma.reembolso.findUnique({
      where: { id_reembolso: id },
    });

    if (!reembolso) {
      throw new NotFoundException(`Reembolso con ID ${id} no encontrado`);
    }

    // Si se está actualizando el monto, verificar que no exceda el monto del pago
    if (updateReembolsoDto.monto) {
      const pago = await this.prisma.pago.findUnique({
        where: { id_pago: reembolso.id_pago },
      });

      if (pago && Number(updateReembolsoDto.monto) > Number(pago.monto)) {
        throw new Error(
          'El monto del reembolso no puede exceder el monto del pago',
        );
      }
    }

    return this.prisma.reembolso.update({
      where: { id_reembolso: id },
      data: updateReembolsoDto,
      include: {
        pago: true,
      },
    });
  }

  async remove(id: number) {
    // Verificar si el reembolso existe
    const reembolso = await this.prisma.reembolso.findUnique({
      where: { id_reembolso: id },
    });

    if (!reembolso) {
      throw new NotFoundException(`Reembolso con ID ${id} no encontrado`);
    }

    return this.prisma.reembolso.delete({
      where: { id_reembolso: id },
    });
  }
}
