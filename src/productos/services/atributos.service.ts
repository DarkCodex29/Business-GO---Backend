import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAtributoDto } from '../dto/create-atributo.dto';
import { UpdateAtributoDto } from '../dto/update-atributo.dto';

@Injectable()
export class AtributosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createAtributoDto: CreateAtributoDto) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: createAtributoDto.id_producto,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createAtributoDto.id_producto} no encontrado`,
      );
    }

    return this.prisma.atributo.create({
      data: {
        id_producto: createAtributoDto.id_producto,
        nombre: createAtributoDto.nombre,
        valor: createAtributoDto.valor,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.atributo.findMany({
      where: {
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const atributo = await this.prisma.atributo.findFirst({
      where: {
        id_atributo: id,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });

    if (!atributo) {
      throw new NotFoundException(`Atributo con ID ${id} no encontrado`);
    }

    return atributo;
  }

  async update(
    id: number,
    empresaId: number,
    updateAtributoDto: UpdateAtributoDto,
  ) {
    // Verificar que el atributo pertenece a un producto de la empresa
    const atributo = await this.prisma.atributo.findFirst({
      where: {
        id_atributo: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!atributo) {
      throw new NotFoundException(`Atributo con ID ${id} no encontrado`);
    }

    return this.prisma.atributo.update({
      where: { id_atributo: id },
      data: updateAtributoDto,
      include: {
        producto: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    // Verificar que el atributo pertenece a un producto de la empresa
    const atributo = await this.prisma.atributo.findFirst({
      where: {
        id_atributo: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!atributo) {
      throw new NotFoundException(`Atributo con ID ${id} no encontrado`);
    }

    return this.prisma.atributo.delete({
      where: { id_atributo: id },
    });
  }

  async findByProducto(id_producto: number, empresaId: number) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${id_producto} no encontrado`,
      );
    }

    return this.prisma.atributo.findMany({
      where: {
        id_producto,
      },
      include: {
        producto: true,
      },
    });
  }
}
