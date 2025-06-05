import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockDto } from '../dto/create-stock.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { BaseProductoService } from './base-producto.service';
import { ProductoValidationService } from './producto-validation.service';

@Injectable()
export class StockManagementService extends BaseProductoService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly productoValidationService: ProductoValidationService,
  ) {
    super(prisma, productoValidationService);
  }

  async createStock(empresaId: number, createStockDto: CreateStockDto) {
    try {
      const { id_producto, cantidad } = createStockDto;

      // Validaciones
      await this.productoValidationService.validateProductoEmpresaExists(
        empresaId,
        id_producto,
      );
      this.productoValidationService.validateStock(cantidad);

      // Verificar que el producto no es un servicio
      const producto = await this.prisma.productoServicio.findUnique({
        where: { id_producto },
        select: { es_servicio: true, nombre: true },
      });

      if (!producto) {
        throw new BadRequestException(
          `Producto con ID ${id_producto} no encontrado`,
        );
      }

      if (producto.es_servicio) {
        throw new BadRequestException('No se puede crear stock para servicios');
      }

      return this.prisma.$transaction(async (tx) => {
        // Verificar si ya existe stock para este producto
        const existingStock = await tx.stock.findUnique({
          where: { id_producto },
        });

        if (existingStock) {
          throw new BadRequestException(
            'Ya existe un registro de stock para este producto',
          );
        }

        // Crear stock
        const stock = await tx.stock.create({
          data: {
            id_producto,
            cantidad,
          },
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
                es_servicio: true,
              },
            },
          },
        });

        this.logger.log(
          `Stock creado: ${cantidad} unidades para producto ${producto.nombre} (ID: ${id_producto})`,
        );

        return stock;
      });
    } catch (error) {
      this.logger.error(`Error al crear stock: ${error.message}`);
      throw error;
    }
  }

  async getStockByEmpresa(empresaId: number) {
    return this.prisma.stock.findMany({
      where: {
        producto: {
          id_empresa: empresaId,
          es_servicio: false, // Solo productos físicos
        },
      },
      include: {
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            categoria: {
              select: { nombre: true },
            },
          },
        },
      },
      orderBy: {
        producto: {
          nombre: 'asc',
        },
      },
    });
  }

  async getStockByProducto(empresaId: number, productoId: number) {
    await this.productoValidationService.validateProductoEmpresaExists(
      empresaId,
      productoId,
    );

    const stock = await this.prisma.stock.findUnique({
      where: { id_producto: productoId },
      include: {
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            es_servicio: true,
          },
        },
      },
    });

    if (!stock) {
      throw new BadRequestException(
        `No existe registro de stock para el producto ${productoId}`,
      );
    }

    return stock;
  }

  async updateStock(
    empresaId: number,
    productoId: number,
    updateStockDto: UpdateStockDto,
  ) {
    try {
      const { cantidad } = updateStockDto;

      // Validaciones
      await this.productoValidationService.validateProductoEmpresaExists(
        empresaId,
        productoId,
      );
      
      if (cantidad !== undefined) {
        this.productoValidationService.validateStock(cantidad);
      }

      return this.prisma.$transaction(async (tx) => {
        // Verificar que existe el stock
        const existingStock = await tx.stock.findUnique({
          where: { id_producto: productoId },
          include: {
            producto: {
              select: { nombre: true, es_servicio: true },
            },
          },
        });

        if (!existingStock) {
          throw new BadRequestException(
            `No existe registro de stock para el producto ${productoId}`,
          );
        }

        if (existingStock.producto.es_servicio) {
          throw new BadRequestException(
            'No se puede actualizar stock de servicios',
          );
        }

        // Actualizar stock
        const stock = await tx.stock.update({
          where: { id_producto: productoId },
          data: { cantidad },
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
                precio: true,
              },
            },
          },
        });

        this.logger.log(
          `Stock actualizado: ${cantidad} unidades para producto ${existingStock.producto.nombre} (ID: ${productoId})`,
        );

        return stock;
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar stock del producto ${productoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async adjustStock(
    empresaId: number,
    productoId: number,
    adjustment: number,
    motivo: string,
  ) {
    try {
      await this.productoValidationService.validateProductoEmpresaExists(
        empresaId,
        productoId,
      );

      return this.prisma.$transaction(async (tx) => {
        // Obtener stock actual
        const currentStock = await tx.stock.findUnique({
          where: { id_producto: productoId },
          include: {
            producto: {
              select: { nombre: true, es_servicio: true },
            },
          },
        });

        if (!currentStock) {
          throw new BadRequestException(
            `No existe registro de stock para el producto ${productoId}`,
          );
        }

        if (currentStock.producto.es_servicio) {
          throw new BadRequestException(
            'No se puede ajustar stock de servicios',
          );
        }

        const newQuantity = currentStock.cantidad + adjustment;

        if (newQuantity < 0) {
          throw new BadRequestException(
            `El ajuste resultaría en stock negativo. Stock actual: ${currentStock.cantidad}, Ajuste: ${adjustment}`,
          );
        }

        // Actualizar stock
        const updatedStock = await tx.stock.update({
          where: { id_producto: productoId },
          data: { cantidad: newQuantity },
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
              },
            },
          },
        });

        this.logger.log(
          `Stock ajustado: ${currentStock.cantidad} → ${newQuantity} (${adjustment > 0 ? '+' : ''}${adjustment}) para producto ${currentStock.producto.nombre}. Motivo: ${motivo}`,
        );

        return {
          ...updatedStock,
          adjustment,
          previousQuantity: currentStock.cantidad,
          motivo,
        };
      });
    } catch (error) {
      this.logger.error(
        `Error al ajustar stock del producto ${productoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async deleteStock(empresaId: number, productoId: number) {
    await this.productoValidationService.validateProductoEmpresaExists(
      empresaId,
      productoId,
    );

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: { id_producto: productoId },
        include: {
          producto: {
            select: { nombre: true },
          },
        },
      });

      if (!stock) {
        throw new BadRequestException(
          `No existe registro de stock para el producto ${productoId}`,
        );
      }

      await tx.stock.delete({
        where: { id_producto: productoId },
      });

      this.logger.log(
        `Stock eliminado para producto ${stock.producto.nombre} (ID: ${productoId})`,
      );

      return { message: 'Stock eliminado correctamente' };
    });
  }

  async getStockBajo(empresaId: number, limite: number = 10) {
    return this.prisma.stock.findMany({
      where: {
        cantidad: {
          lte: limite,
        },
        producto: {
          id_empresa: empresaId,
          es_servicio: false,
        },
      },
      include: {
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            categoria: {
              select: { nombre: true },
            },
          },
        },
      },
      orderBy: {
        cantidad: 'asc',
      },
    });
  }

  async getStockStats(empresaId: number) {
    const [totalProductos, stockBajo, valorTotal] = await Promise.all([
      this.prisma.stock.count({
        where: {
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
      }),
      this.prisma.stock.count({
        where: {
          cantidad: {
            lte: 10,
          },
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
      }),
      this.prisma.stock.aggregate({
        where: {
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
        _sum: {
          cantidad: true,
        },
      }),
    ]);

    return {
      totalProductos,
      stockBajo,
      totalUnidades: valorTotal._sum.cantidad || 0,
    };
  }
}
