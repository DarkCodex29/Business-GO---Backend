import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrecioDto } from '../dto/create-precio.dto';
import { UpdatePrecioDto } from '../dto/update-precio.dto';

@Injectable()
export class PreciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPrecioDto: CreatePrecioDto) {
    // Verificar si el producto existe
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: createPrecioDto.id_producto },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createPrecioDto.id_producto} no encontrado`,
      );
    }

    return this.prisma.historialPrecio.create({
      data: {
        id_producto: createPrecioDto.id_producto,
        precio_anterior: createPrecioDto.precio_anterior,
        precio_nuevo: createPrecioDto.precio_nuevo,
        motivo: createPrecioDto.motivo,
        id_usuario: createPrecioDto.id_usuario,
      },
    });
  }

  async findAll() {
    return this.prisma.historialPrecio.findMany({
      include: {
        producto: true,
        usuario: true,
      },
    });
  }

  async findOne(id: number) {
    const precio = await this.prisma.historialPrecio.findUnique({
      where: { id_historial_precio: id },
      include: {
        producto: true,
        usuario: true,
      },
    });

    if (!precio) {
      throw new NotFoundException(`Precio con ID ${id} no encontrado`);
    }

    return precio;
  }

  async update(id: number, updatePrecioDto: UpdatePrecioDto) {
    // Verificar si el precio existe
    const precio = await this.prisma.historialPrecio.findUnique({
      where: { id_historial_precio: id },
    });

    if (!precio) {
      throw new NotFoundException(`Precio con ID ${id} no encontrado`);
    }

    return this.prisma.historialPrecio.update({
      where: { id_historial_precio: id },
      data: {
        precio_anterior: updatePrecioDto.precio_anterior,
        precio_nuevo: updatePrecioDto.precio_nuevo,
        motivo: updatePrecioDto.motivo,
      },
    });
  }

  async remove(id: number) {
    // Verificar si el precio existe
    const precio = await this.prisma.historialPrecio.findUnique({
      where: { id_historial_precio: id },
    });

    if (!precio) {
      throw new NotFoundException(`Precio con ID ${id} no encontrado`);
    }

    return this.prisma.historialPrecio.delete({
      where: { id_historial_precio: id },
    });
  }
}
