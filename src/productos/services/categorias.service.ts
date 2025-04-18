import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoriaDto } from '../dto/create-categoria.dto';
import { UpdateCategoriaDto } from '../dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoriaDto: CreateCategoriaDto) {
    return this.prisma.categoria.create({
      data: {
        nombre: createCategoriaDto.nombre,
      },
      include: {
        subcategorias: true,
      },
    });
  }

  async findAll() {
    return this.prisma.categoria.findMany({
      include: {
        subcategorias: true,
      },
    });
  }

  async findOne(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
      include: {
        subcategorias: true,
        productos: true,
      },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return categoria;
  }

  async update(id: number, updateCategoriaDto: UpdateCategoriaDto) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return this.prisma.categoria.update({
      where: { id_categoria: id },
      data: {
        nombre: updateCategoriaDto.nombre,
      },
      include: {
        subcategorias: true,
      },
    });
  }

  async remove(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return this.prisma.categoria.delete({
      where: { id_categoria: id },
    });
  }
}
