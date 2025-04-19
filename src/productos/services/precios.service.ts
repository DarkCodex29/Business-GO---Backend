import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrecioDto } from '../dto/create-precio.dto';
import { UpdatePrecioDto } from '../dto/update-precio.dto';

@Injectable()
export class PreciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createPrecioDto: CreatePrecioDto) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: createPrecioDto.id_producto,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createPrecioDto.id_producto} no encontrado`,
      );
    }

    // Crear el historial de precio
    return this.prisma.historialPrecio.create({
      data: {
        id_producto: createPrecioDto.id_producto,
        precio_anterior: producto.precio,
        precio_nuevo: createPrecioDto.precio,
        motivo: createPrecioDto.motivo,
        id_usuario: createPrecioDto.id_usuario,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.historialPrecio.findMany({
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
    const precio = await this.prisma.historialPrecio.findFirst({
      where: {
        id_historial_precio: id,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });

    if (!precio) {
      throw new NotFoundException(`Precio con ID ${id} no encontrado`);
    }

    return precio;
  }

  async update(
    id: number,
    empresaId: number,
    updatePrecioDto: UpdatePrecioDto,
  ) {
    // Verificar que el precio pertenece a un producto de la empresa
    const precio = await this.prisma.historialPrecio.findFirst({
      where: {
        id_historial_precio: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!precio) {
      throw new NotFoundException(`Precio con ID ${id} no encontrado`);
    }

    return this.prisma.historialPrecio.update({
      where: { id_historial_precio: id },
      data: updatePrecioDto,
      include: {
        producto: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    // Verificar que el precio pertenece a un producto de la empresa
    const precio = await this.prisma.historialPrecio.findFirst({
      where: {
        id_historial_precio: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!precio) {
      throw new NotFoundException(`Precio con ID ${id} no encontrado`);
    }

    return this.prisma.historialPrecio.delete({
      where: { id_historial_precio: id },
    });
  }
}
