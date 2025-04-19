import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockDto } from '../dto/create-stock.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { CreateDisponibilidadDto } from '../dto/create-disponibilidad.dto';
import { UpdateDisponibilidadDto } from '../dto/update-disponibilidad.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createStockDto: CreateStockDto) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: createStockDto.id_producto,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createStockDto.id_producto} no encontrado`,
      );
    }

    return this.prisma.stock.create({
      data: {
        ...createStockDto,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.stock.findMany({
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
    const stock = await this.prisma.stock.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });

    if (!stock) {
      throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    }

    return stock;
  }

  async update(id: number, empresaId: number, updateStockDto: UpdateStockDto) {
    // Verificar que el stock pertenece a un producto de la empresa
    const stock = await this.prisma.stock.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    }

    return this.prisma.stock.update({
      where: { id_producto: id },
      data: updateStockDto,
      include: {
        producto: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    // Verificar que el stock pertenece a un producto de la empresa
    const stock = await this.prisma.stock.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(`Stock con ID ${id} no encontrado`);
    }

    return this.prisma.stock.delete({
      where: { id_producto: id },
    });
  }

  async createDisponibilidad(
    empresaId: number,
    createDisponibilidadDto: CreateDisponibilidadDto,
  ) {
    // Verificar que el producto pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: createDisponibilidadDto.id_producto,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createDisponibilidadDto.id_producto} no encontrado`,
      );
    }

    return this.prisma.disponibilidad.create({
      data: {
        ...createDisponibilidadDto,
      },
      include: {
        producto: true,
      },
    });
  }

  async findAllDisponibilidad(empresaId: number) {
    return this.prisma.disponibilidad.findMany({
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

  async findOneDisponibilidad(id: number, empresaId: number) {
    const disponibilidad = await this.prisma.disponibilidad.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
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
    empresaId: number,
    updateDisponibilidadDto: UpdateDisponibilidadDto,
  ) {
    // Verificar que la disponibilidad pertenece a un producto de la empresa
    const disponibilidad = await this.prisma.disponibilidad.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!disponibilidad) {
      throw new NotFoundException(`Disponibilidad con ID ${id} no encontrada`);
    }

    return this.prisma.disponibilidad.update({
      where: { id_producto: id },
      data: updateDisponibilidadDto,
      include: {
        producto: true,
      },
    });
  }

  async removeDisponibilidad(id: number, empresaId: number) {
    // Verificar que la disponibilidad pertenece a un producto de la empresa
    const disponibilidad = await this.prisma.disponibilidad.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!disponibilidad) {
      throw new NotFoundException(`Disponibilidad con ID ${id} no encontrada`);
    }

    return this.prisma.disponibilidad.delete({
      where: { id_producto: id },
    });
  }
}
