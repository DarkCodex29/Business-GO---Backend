import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createProductoDto: CreateProductoDto) {
    return this.prisma.productoServicio.create({
      data: {
        ...createProductoDto,
        id_empresa: empresaId,
      },
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
      },
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: id,
        id_empresa: empresaId,
      },
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
        atributos: true,
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async update(
    id: number,
    empresaId: number,
    updateProductoDto: UpdateProductoDto,
  ) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: id,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return this.prisma.productoServicio.update({
      where: { id_producto: id },
      data: updateProductoDto,
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: id,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return this.prisma.productoServicio.delete({
      where: { id_producto: id },
    });
  }
}
