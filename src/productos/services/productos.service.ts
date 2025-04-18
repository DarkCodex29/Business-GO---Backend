import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto) {
    return this.prisma.productoServicio.create({
      data: {
        nombre: createProductoDto.nombre,
        precio: createProductoDto.precio,
        id_empresa: createProductoDto.id_empresa,
        id_categoria: createProductoDto.id_categoria,
        id_subcategoria: createProductoDto.id_subcategoria,
        es_servicio: createProductoDto.es_servicio || false,
      },
      include: {
        categoria: true,
        subcategoria: true,
        atributos: true,
        disponibilidad: true,
        stock: true,
      },
    });
  }

  async findAll() {
    return this.prisma.productoServicio.findMany({
      include: {
        categoria: true,
        subcategoria: true,
        atributos: true,
        disponibilidad: true,
        stock: true,
      },
    });
  }

  async findOne(id: number) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: id },
      include: {
        categoria: true,
        subcategoria: true,
        atributos: true,
        disponibilidad: true,
        stock: true,
        historial_precios: true,
        precios_zona: true,
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: id },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return this.prisma.productoServicio.update({
      where: { id_producto: id },
      data: {
        nombre: updateProductoDto.nombre,
        precio: updateProductoDto.precio,
        id_categoria: updateProductoDto.id_categoria,
        id_subcategoria: updateProductoDto.id_subcategoria,
        es_servicio: updateProductoDto.es_servicio,
      },
      include: {
        categoria: true,
        subcategoria: true,
        atributos: true,
        disponibilidad: true,
        stock: true,
      },
    });
  }

  async remove(id: number) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: id },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return this.prisma.productoServicio.delete({
      where: { id_producto: id },
    });
  }
}
