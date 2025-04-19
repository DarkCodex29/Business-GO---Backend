import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: number) {
    return this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
      },
      include: {
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
        stock: true,
        disponibilidad: true,
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async getStock(id: number, empresaId: number) {
    const stock = await this.prisma.stock.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(`Stock para producto ${id} no encontrado`);
    }

    return stock;
  }

  async getDisponibilidad(id: number, empresaId: number) {
    const disponibilidad = await this.prisma.disponibilidad.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!disponibilidad) {
      throw new NotFoundException(
        `Disponibilidad para producto ${id} no encontrada`,
      );
    }

    return disponibilidad;
  }

  async updateStock(id: number, cantidad: number, empresaId: number) {
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

    const stock = await this.prisma.stock.upsert({
      where: { id_producto: id },
      update: { cantidad },
      create: {
        id_producto: id,
        cantidad,
      },
    });

    return stock;
  }

  async updateDisponibilidad(
    id: number,
    disponible: boolean,
    empresaId: number,
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

    const disponibilidad = await this.prisma.disponibilidad.upsert({
      where: { id_producto: id },
      update: { cantidad_disponible: disponible ? 1 : 0 },
      create: {
        id_producto: id,
        cantidad_disponible: disponible ? 1 : 0,
      },
    });

    return disponibilidad;
  }

  async getStockBajo(umbral: number, empresaId: number) {
    return this.prisma.stock.findMany({
      where: {
        cantidad: {
          lte: umbral,
        },
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });
  }

  async getProductosSinStock(empresaId: number) {
    return this.prisma.stock.findMany({
      where: {
        cantidad: 0,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });
  }

  async getProductosAgotados(empresaId: number) {
    return this.prisma.disponibilidad.findMany({
      where: {
        cantidad_disponible: 0,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        producto: true,
      },
    });
  }

  async findByEmpresa(empresaId: number) {
    return this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
      },
      include: {
        stock: true,
        disponibilidad: true,
        categoria: true,
        subcategoria: true,
      },
    });
  }
}
