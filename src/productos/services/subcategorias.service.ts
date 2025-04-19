import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoriaDto } from '../dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from '../dto/update-subcategoria.dto';

@Injectable()
export class SubcategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    categoriaId: number,
    createSubcategoriaDto: CreateSubcategoriaDto,
  ) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: categoriaId },
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${categoriaId} no encontrada`,
      );
    }

    return this.prisma.subcategoria.create({
      data: {
        nombre: createSubcategoriaDto.nombre,
        id_categoria: categoriaId,
      },
      include: {
        categoria: true,
      },
    });
  }

  async findAll() {
    return this.prisma.subcategoria.findMany({
      include: {
        categoria: true,
      },
    });
  }

  async findOne(id: number) {
    const subcategoria = await this.prisma.subcategoria.findUnique({
      where: { id_subcategoria: id },
      include: {
        categoria: true,
        productos: true,
      },
    });

    if (!subcategoria) {
      throw new NotFoundException(`Subcategoría con ID ${id} no encontrada`);
    }

    return subcategoria;
  }

  async update(id: number, updateSubcategoriaDto: UpdateSubcategoriaDto) {
    const subcategoria = await this.prisma.subcategoria.findUnique({
      where: { id_subcategoria: id },
    });

    if (!subcategoria) {
      throw new NotFoundException(`Subcategoría con ID ${id} no encontrada`);
    }

    if (updateSubcategoriaDto.id_categoria) {
      const categoria = await this.prisma.categoria.findUnique({
        where: { id_categoria: updateSubcategoriaDto.id_categoria },
      });

      if (!categoria) {
        throw new NotFoundException(
          `Categoría con ID ${updateSubcategoriaDto.id_categoria} no encontrada`,
        );
      }
    }

    return this.prisma.subcategoria.update({
      where: { id_subcategoria: id },
      data: {
        nombre: updateSubcategoriaDto.nombre,
        id_categoria: updateSubcategoriaDto.id_categoria,
      },
      include: {
        categoria: true,
      },
    });
  }

  async remove(id: number) {
    const subcategoria = await this.prisma.subcategoria.findUnique({
      where: { id_subcategoria: id },
    });

    if (!subcategoria) {
      throw new NotFoundException(`Subcategoría con ID ${id} no encontrada`);
    }

    return this.prisma.subcategoria.delete({
      where: { id_subcategoria: id },
    });
  }
}
