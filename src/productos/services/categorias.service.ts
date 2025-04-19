import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoriaDto } from '../dto/create-categoria.dto';
import { UpdateCategoriaDto } from '../dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createCategoriaDto: CreateCategoriaDto) {
    return this.prisma.categoria.create({
      data: {
        nombre: createCategoriaDto.nombre,
      },
      include: {
        subcategorias: true,
        productos: {
          where: {
            id_empresa: empresaId,
          },
        },
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.categoria.findMany({
      include: {
        subcategorias: true,
        productos: {
          where: {
            id_empresa: empresaId,
          },
        },
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
      include: {
        subcategorias: true,
        productos: {
          where: {
            id_empresa: empresaId,
          },
        },
      },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return categoria;
  }

  async update(
    id: number,
    empresaId: number,
    updateCategoriaDto: UpdateCategoriaDto,
  ) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return this.prisma.categoria.update({
      where: { id_categoria: id },
      data: updateCategoriaDto,
      include: {
        subcategorias: true,
        productos: {
          where: {
            id_empresa: empresaId,
          },
        },
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
      include: {
        productos: {
          where: {
            id_empresa: empresaId,
          },
        },
      },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    // Verificar si la categoría tiene productos asociados
    if (categoria.productos.length > 0) {
      throw new NotFoundException(
        `No se puede eliminar la categoría porque tiene productos asociados`,
      );
    }

    return this.prisma.categoria.delete({
      where: { id_categoria: id },
    });
  }
}
