import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoriaDto } from '../dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from '../dto/update-subcategoria.dto';

@Injectable()
export class SubcategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    empresaId: number,
    categoriaId: number,
    createSubcategoriaDto: CreateSubcategoriaDto,
  ) {
    // Verificar que la categoría pertenece a la empresa
    const categoria = await this.prisma.categoria.findFirst({
      where: {
        id_categoria: categoriaId,
        productos: {
          some: {
            id_empresa: empresaId,
          },
        },
      },
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${categoriaId} no encontrada en la empresa ${empresaId}`,
      );
    }

    return this.prisma.subcategoria.create({
      data: {
        ...createSubcategoriaDto,
        id_categoria: categoriaId,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.subcategoria.findMany({
      where: {
        categoria: {
          productos: {
            some: {
              id_empresa: empresaId,
            },
          },
        },
      },
      include: {
        categoria: true,
      },
    });
  }

  async findOne(empresaId: number, categoriaId: number, id: number) {
    const subcategoria = await this.prisma.subcategoria.findFirst({
      where: {
        id_subcategoria: id,
        id_categoria: categoriaId,
        categoria: {
          productos: {
            some: {
              id_empresa: empresaId,
            },
          },
        },
      },
      include: {
        categoria: true,
      },
    });

    if (!subcategoria) {
      throw new NotFoundException(
        `Subcategoría con ID ${id} no encontrada en la categoría ${categoriaId} de la empresa ${empresaId}`,
      );
    }

    return subcategoria;
  }

  async update(
    empresaId: number,
    categoriaId: number,
    id: number,
    updateSubcategoriaDto: UpdateSubcategoriaDto,
  ) {
    await this.findOne(empresaId, categoriaId, id);

    return this.prisma.subcategoria.update({
      where: {
        id_subcategoria: id,
      },
      data: updateSubcategoriaDto,
      include: {
        categoria: true,
      },
    });
  }

  async remove(empresaId: number, categoriaId: number, id: number) {
    await this.findOne(empresaId, categoriaId, id);

    return this.prisma.subcategoria.delete({
      where: {
        id_subcategoria: id,
      },
      include: {
        categoria: true,
      },
    });
  }
}
