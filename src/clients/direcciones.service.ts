import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDireccionDto: CreateDireccionDto) {
    // Verificar si la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: createDireccionDto.id_empresa },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return this.prisma.direccion.create({
      data: {
        direccion: createDireccionDto.direccion,
        departamento: createDireccionDto.departamento,
        provincia: createDireccionDto.provincia,
        distrito: createDireccionDto.distrito,
        id_empresa: createDireccionDto.id_empresa,
      },
      include: {
        empresa: true,
      },
    });
  }

  findAll() {
    return this.prisma.direccion.findMany({
      include: {
        empresa: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.direccion.findUnique({
      where: { id_direccion: id },
      include: {
        empresa: true,
      },
    });
  }

  async update(id: number, updateDireccionDto: UpdateDireccionDto) {
    // Verificar si la dirección existe
    const direccion = await this.prisma.direccion.findUnique({
      where: { id_direccion: id },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // Si se está actualizando la empresa, verificar que existe
    if (updateDireccionDto.id_empresa) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id_empresa: updateDireccionDto.id_empresa },
      });

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }
    }

    return this.prisma.direccion.update({
      where: { id_direccion: id },
      data: {
        direccion: updateDireccionDto.direccion,
        departamento: updateDireccionDto.departamento,
        provincia: updateDireccionDto.provincia,
        distrito: updateDireccionDto.distrito,
        id_empresa: updateDireccionDto.id_empresa,
      },
      include: {
        empresa: true,
      },
    });
  }

  async remove(id: number) {
    // Verificar si la dirección existe
    const direccion = await this.prisma.direccion.findUnique({
      where: { id_direccion: id },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return this.prisma.direccion.delete({
      where: { id_direccion: id },
    });
  }
}
