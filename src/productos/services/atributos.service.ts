import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAtributoDto } from '../dto/create-atributo.dto';
import { UpdateAtributoDto } from '../dto/update-atributo.dto';

@Injectable()
export class AtributosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAtributoDto: CreateAtributoDto) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: createAtributoDto.id_producto },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createAtributoDto.id_producto} no encontrado`,
      );
    }

    return this.prisma.atributo.create({
      data: {
        nombre: createAtributoDto.nombre,
        valor: createAtributoDto.valor,
        id_producto: createAtributoDto.id_producto,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAll() {
    return this.prisma.atributo.findMany({
      include: {
        producto: true,
      },
    });
  }

  async findOne(id: number) {
    const atributo = await this.prisma.atributo.findUnique({
      where: { id_atributo: id },
      include: {
        producto: true,
      },
    });

    if (!atributo) {
      throw new NotFoundException(`Atributo con ID ${id} no encontrado`);
    }

    return atributo;
  }

  async update(id: number, updateAtributoDto: UpdateAtributoDto) {
    const atributo = await this.prisma.atributo.findUnique({
      where: { id_atributo: id },
    });

    if (!atributo) {
      throw new NotFoundException(`Atributo con ID ${id} no encontrado`);
    }

    if (updateAtributoDto.id_producto) {
      const producto = await this.prisma.productoServicio.findUnique({
        where: { id_producto: updateAtributoDto.id_producto },
      });

      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${updateAtributoDto.id_producto} no encontrado`,
        );
      }
    }

    return this.prisma.atributo.update({
      where: { id_atributo: id },
      data: {
        nombre: updateAtributoDto.nombre,
        valor: updateAtributoDto.valor,
        id_producto: updateAtributoDto.id_producto,
      },
      include: {
        producto: true,
      },
    });
  }

  async remove(id: number) {
    const atributo = await this.prisma.atributo.findUnique({
      where: { id_atributo: id },
    });

    if (!atributo) {
      throw new NotFoundException(`Atributo con ID ${id} no encontrado`);
    }

    return this.prisma.atributo.delete({
      where: { id_atributo: id },
    });
  }

  async findByProducto(id_producto: number) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${id_producto} no encontrado`,
      );
    }

    return this.prisma.atributo.findMany({
      where: { id_producto },
      include: {
        producto: true,
      },
    });
  }
}
