import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';

@Injectable()
export class ValoracionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createValoracionDto: CreateValoracionDto) {
    // Verificar que el cliente existe
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: createValoracionDto.id_cliente,
        empresas: {
          some: {
            empresa: {
              id_empresa: empresaId,
            },
          },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(
        `Cliente con ID ${createValoracionDto.id_cliente} no encontrado`,
      );
    }

    // Verificar que el producto existe y pertenece a la empresa
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: createValoracionDto.id_producto,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createValoracionDto.id_producto} no encontrado`,
      );
    }

    return this.prisma.valoracion.create({
      data: {
        ...createValoracionDto,
        puntuacion: createValoracionDto.calificacion,
      },
      include: {
        cliente: true,
        producto: true,
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.valoracion.findMany({
      where: {
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        cliente: true,
        producto: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const valoracion = await this.prisma.valoracion.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        cliente: true,
        producto: true,
      },
    });

    if (!valoracion) {
      throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
    }

    return valoracion;
  }

  async update(
    id: number,
    empresaId: number,
    updateValoracionDto: UpdateValoracionDto,
  ) {
    // Verificar que la valoración existe y pertenece a un producto de la empresa
    const valoracion = await this.prisma.valoracion.findFirst({
      where: {
        id_producto: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!valoracion) {
      throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
    }

    // Si se está actualizando el producto, verificar que pertenece a la empresa
    if (updateValoracionDto.id_producto) {
      const producto = await this.prisma.productoServicio.findFirst({
        where: {
          id_producto: updateValoracionDto.id_producto,
          id_empresa: empresaId,
        },
      });

      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${updateValoracionDto.id_producto} no encontrado`,
        );
      }
    }

    // Si se está actualizando el cliente, verificar que pertenece a la empresa
    if (updateValoracionDto.id_cliente) {
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          id_cliente: updateValoracionDto.id_cliente,
          empresas: {
            some: {
              empresa: {
                id_empresa: empresaId,
              },
            },
          },
        },
      });

      if (!cliente) {
        throw new NotFoundException(
          `Cliente con ID ${updateValoracionDto.id_cliente} no encontrado`,
        );
      }
    }

    return this.prisma.valoracion.update({
      where: { id_valoracion: id },
      data: updateValoracionDto,
      include: {
        cliente: true,
        producto: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    // Verificar que la valoración existe y pertenece a un producto de la empresa
    const valoracion = await this.prisma.valoracion.findFirst({
      where: {
        id_valoracion: id,
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    if (!valoracion) {
      throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
    }

    return this.prisma.valoracion.delete({
      where: { id_valoracion: id },
    });
  }

  async findByProducto(productoId: number, empresaId: number) {
    return this.prisma.valoracion.findMany({
      where: {
        id_producto: productoId,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        cliente: true,
        producto: true,
      },
    });
  }

  async findByCliente(clienteId: number, empresaId: number) {
    return this.prisma.valoracion.findMany({
      where: {
        id_cliente: clienteId,
        cliente: {
          empresas: {
            some: {
              empresa: {
                id_empresa: empresaId,
              },
            },
          },
        },
      },
      include: {
        cliente: true,
        producto: true,
      },
    });
  }
}
