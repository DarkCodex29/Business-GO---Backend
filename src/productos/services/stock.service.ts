import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockDto } from '../dto/create-stock.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { CreateDisponibilidadDto } from '../dto/create-disponibilidad.dto';
import { UpdateDisponibilidadDto } from '../dto/update-disponibilidad.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // Stock
  async createStock(createStockDto: CreateStockDto) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: createStockDto.id_producto },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createStockDto.id_producto} no encontrado`,
      );
    }

    // Verificar si ya existe un registro de stock para este producto
    const existingStock = await this.prisma.stock.findUnique({
      where: { id_producto: createStockDto.id_producto },
    });

    if (existingStock) {
      throw new NotFoundException(
        `Ya existe un registro de stock para el producto con ID ${createStockDto.id_producto}`,
      );
    }

    return this.prisma.stock.create({
      data: {
        cantidad: createStockDto.cantidad,
        id_producto: createStockDto.id_producto,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAllStock() {
    return this.prisma.stock.findMany({
      include: {
        producto: true,
      },
    });
  }

  async findOneStock(id: number) {
    const stock = await this.prisma.stock.findUnique({
      where: { id_stock: id },
      include: {
        producto: true,
      },
    });

    if (!stock) {
      throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    }

    return stock;
  }

  async updateStock(id: number, updateStockDto: UpdateStockDto) {
    const stock = await this.prisma.stock.findUnique({
      where: { id_stock: id },
    });

    if (!stock) {
      throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    }

    return this.prisma.stock.update({
      where: { id_stock: id },
      data: {
        cantidad: updateStockDto.cantidad,
      },
      include: {
        producto: true,
      },
    });
  }

  async removeStock(id: number) {
    const stock = await this.prisma.stock.findUnique({
      where: { id_stock: id },
    });

    if (!stock) {
      throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    }

    return this.prisma.stock.delete({
      where: { id_stock: id },
    });
  }

  // Disponibilidad
  async createDisponibilidad(createDisponibilidadDto: CreateDisponibilidadDto) {
    const producto = await this.prisma.productoServicio.findUnique({
      where: { id_producto: createDisponibilidadDto.id_producto },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createDisponibilidadDto.id_producto} no encontrado`,
      );
    }

    // Verificar si ya existe un registro de disponibilidad para este producto
    const existingDisponibilidad = await this.prisma.disponibilidad.findUnique({
      where: { id_producto: createDisponibilidadDto.id_producto },
    });

    if (existingDisponibilidad) {
      throw new NotFoundException(
        `Ya existe un registro de disponibilidad para el producto con ID ${createDisponibilidadDto.id_producto}`,
      );
    }

    return this.prisma.disponibilidad.create({
      data: {
        cantidad_disponible: createDisponibilidadDto.cantidad_disponible,
        id_producto: createDisponibilidadDto.id_producto,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAllDisponibilidad() {
    return this.prisma.disponibilidad.findMany({
      include: {
        producto: true,
      },
    });
  }

  async findOneDisponibilidad(id: number) {
    const disponibilidad = await this.prisma.disponibilidad.findUnique({
      where: { id_disponibilidad: id },
      include: {
        producto: true,
      },
    });

    if (!disponibilidad) {
      throw new NotFoundException(`Disponibilidad con ID ${id} no encontrada`);
    }

    return disponibilidad;
  }

  async updateDisponibilidad(
    id: number,
    updateDisponibilidadDto: UpdateDisponibilidadDto,
  ) {
    const disponibilidad = await this.prisma.disponibilidad.findUnique({
      where: { id_disponibilidad: id },
    });

    if (!disponibilidad) {
      throw new NotFoundException(`Disponibilidad con ID ${id} no encontrada`);
    }

    return this.prisma.disponibilidad.update({
      where: { id_disponibilidad: id },
      data: {
        cantidad_disponible: updateDisponibilidadDto.cantidad_disponible,
      },
      include: {
        producto: true,
      },
    });
  }

  async removeDisponibilidad(id: number) {
    const disponibilidad = await this.prisma.disponibilidad.findUnique({
      where: { id_disponibilidad: id },
    });

    if (!disponibilidad) {
      throw new NotFoundException(`Disponibilidad con ID ${id} no encontrada`);
    }

    return this.prisma.disponibilidad.delete({
      where: { id_disponibilidad: id },
    });
  }
}
