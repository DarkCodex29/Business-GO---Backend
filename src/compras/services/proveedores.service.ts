import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createProveedorDto: CreateProveedorDto) {
    return this.prisma.proveedor.create({
      data: {
        ...createProveedorDto,
        empresa_id: empresaId,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.proveedor.findMany({
      where: {
        empresa_id: empresaId,
      },
      include: {
        ordenes_compra: true,
        productos: true,
        cotizaciones: true,
      },
    });
  }

  async findOne(id: number) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id_proveedor: id },
      include: {
        ordenes_compra: true,
        productos: true,
        cotizaciones: true,
      },
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    return proveedor;
  }

  async update(id: number, updateProveedorDto: UpdateProveedorDto) {
    await this.findOne(id);
    return this.prisma.proveedor.update({
      where: { id_proveedor: id },
      data: updateProveedorDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.proveedor.update({
      where: { id_proveedor: id },
      data: { activo: false },
    });
  }

  async addProducto(
    id: number,
    productoId: number,
    data: any,
    empresaId: number,
  ) {
    await this.findOne(id);
    return this.prisma.productoProveedor.create({
      data: {
        id_proveedor: id,
        id_producto: productoId,
        ...data,
      },
    });
  }

  async removeProducto(id: number, productoId: number, empresaId: number) {
    await this.findOne(id);
    return this.prisma.productoProveedor.delete({
      where: {
        id_proveedor_id_producto: {
          id_proveedor: id,
          id_producto: productoId,
        },
      },
    });
  }
}
