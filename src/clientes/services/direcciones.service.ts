import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    empresaId: number,
    createDireccionDto: CreateClienteDireccionDto,
  ) {
    return this.prisma.direccion.create({
      data: {
        ...createDireccionDto,
        id_empresa: empresaId,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.direccion.findMany({
      where: {
        id_empresa: empresaId,
      },
    });
  }

  async findOne(empresaId: number, id: number) {
    const direccion = await this.prisma.direccion.findFirst({
      where: {
        id_direccion: id,
        id_empresa: empresaId,
      },
    });

    if (!direccion) {
      throw new NotFoundException(
        `Dirección con ID ${id} no encontrada para la empresa ${empresaId}`,
      );
    }

    return direccion;
  }

  async update(
    empresaId: number,
    id: number,
    updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    // Verificar que la dirección existe y pertenece a la empresa
    await this.findOne(empresaId, id);

    return this.prisma.direccion.update({
      where: {
        id_direccion: id,
      },
      data: updateDireccionDto,
    });
  }

  async remove(empresaId: number, id: number) {
    // Verificar que la dirección existe y pertenece a la empresa
    await this.findOne(empresaId, id);

    return this.prisma.direccion.delete({
      where: {
        id_direccion: id,
      },
    });
  }
}
