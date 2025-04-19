import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDireccionDto: CreateClienteDireccionDto) {
    return this.prisma.direccion.create({
      data: {
        direccion: createDireccionDto.direccion,
        departamento: createDireccionDto.departamento,
        provincia: createDireccionDto.provincia,
        distrito: createDireccionDto.distrito,
        id_empresa: createDireccionDto.id_empresa,
      },
    });
  }

  async findAll() {
    return this.prisma.direccion.findMany();
  }

  async findOne(id: number) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id_direccion: id },
    });

    if (!direccion) {
      throw new NotFoundException(`Dirección con ID ${id} no encontrada`);
    }

    return direccion;
  }

  async update(id: number, updateDireccionDto: UpdateClienteDireccionDto) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id_direccion: id },
    });

    if (!direccion) {
      throw new NotFoundException(`Dirección con ID ${id} no encontrada`);
    }

    return this.prisma.direccion.update({
      where: { id_direccion: id },
      data: updateDireccionDto,
    });
  }

  async remove(id: number) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id_direccion: id },
    });

    if (!direccion) {
      throw new NotFoundException(`Dirección con ID ${id} no encontrada`);
    }

    return this.prisma.direccion.delete({
      where: { id_direccion: id },
    });
  }
}
