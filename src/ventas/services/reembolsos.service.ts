import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReembolsoDto } from '../dto/create-reembolso.dto';
import { UpdateReembolsoDto } from '../dto/update-reembolso.dto';

@Injectable()
export class ReembolsosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createReembolsoDto: CreateReembolsoDto) {
    // Verificar que el pago pertenece a la empresa
    const pago = await this.prisma.pago.findFirst({
      where: {
        id_pago: createReembolsoDto.id_pago,
        historial: {
          producto: {
            id_empresa: empresaId,
          },
        },
      },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

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

  async findAll(empresaId: number) {
    return this.prisma.reembolso.findMany({
      where: {
        pago: {
          historial: {
            producto: {
              id_empresa: empresaId,
            },
          },
        },
      },
      include: {
        pago: true,
      },
    });
  }

  async findOne(empresaId: number, id: number) {
    const reembolso = await this.prisma.reembolso.findFirst({
      where: {
        id_reembolso: id,
        pago: {
          historial: {
            producto: {
              id_empresa: empresaId,
            },
          },
        },
      },
      include: {
        pago: true,
      },
    });

    if (!reembolso) {
      throw new NotFoundException('Reembolso no encontrado');
    }

    return reembolso;
  }

  async update(
    empresaId: number,
    id: number,
    updateReembolsoDto: UpdateReembolsoDto,
  ) {
    await this.findOne(empresaId, id);

    return this.prisma.reembolso.update({
      where: {
        id_reembolso: id,
      },
      data: updateReembolsoDto,
      include: {
        pago: true,
      },
    });
  }

  async remove(empresaId: number, id: number) {
    await this.findOne(empresaId, id);

    return this.prisma.reembolso.delete({
      where: {
        id_reembolso: id,
      },
    });
  }
}
