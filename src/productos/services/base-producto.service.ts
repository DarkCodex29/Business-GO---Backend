import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductoValidationService } from './producto-validation.service';

export interface IProductoQuery {
  empresaId: number;
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: number;
  subcategoriaId?: number;
  esServicio?: boolean;
  precioMin?: number;
  precioMax?: number;
}

export interface IProductoResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export abstract class BaseProductoService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly productoValidationService: ProductoValidationService,
  ) {}

  // Template Method Pattern - Define el algoritmo general
  protected async findProductosByEmpresa(
    query: IProductoQuery,
  ): Promise<IProductoResponse<any>> {
    const {
      empresaId,
      page = 1,
      limit = 10,
      search,
      categoriaId,
      subcategoriaId,
      esServicio,
      precioMin,
      precioMax,
    } = query;
    const skip = (page - 1) * limit;

    // Construir filtros dinámicos
    const whereClause: any = {
      id_empresa: empresaId,
    };

    if (search) {
      whereClause.nombre = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (categoriaId) {
      whereClause.id_categoria = categoriaId;
    }

    if (subcategoriaId) {
      whereClause.id_subcategoria = subcategoriaId;
    }

    if (esServicio !== undefined) {
      whereClause.es_servicio = esServicio;
    }

    if (precioMin !== undefined || precioMax !== undefined) {
      whereClause.precio = {};
      if (precioMin !== undefined) {
        whereClause.precio.gte = precioMin;
      }
      if (precioMax !== undefined) {
        whereClause.precio.lte = precioMax;
      }
    }

    // Ejecutar consultas en paralelo para optimizar rendimiento
    const [productos, total] = await Promise.all([
      this.prisma.productoServicio.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: this.getProductoIncludes(),
        orderBy: this.getDefaultOrderBy(),
      }),
      this.prisma.productoServicio.count({ where: whereClause }),
    ]);

    return {
      data: productos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  protected async findProductoByEmpresa(empresaId: number, productoId: number) {
    await this.productoValidationService.validateProductoEmpresaExists(
      empresaId,
      productoId,
    );

    return this.prisma.productoServicio.findUnique({
      where: { id_producto: productoId },
      include: this.getProductoIncludes(),
    });
  }

  protected async createProductoTransaction(
    empresaId: number,
    productoData: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Crear el producto
      const producto = await tx.productoServicio.create({
        data: {
          ...productoData,
          id_empresa: empresaId,
        },
        include: this.getProductoIncludes(),
      });

      // Si es un producto físico, crear stock inicial
      if (!producto.es_servicio) {
        await tx.stock.create({
          data: {
            id_producto: producto.id_producto,
            cantidad: 0,
          },
        });

        await tx.disponibilidad.create({
          data: {
            id_producto: producto.id_producto,
            cantidad_disponible: 0,
          },
        });
      }

      this.logger.log(
        `Producto creado: ${producto.nombre} (ID: ${producto.id_producto}) para empresa ${empresaId}`,
      );
      return producto;
    });
  }

  protected async updateProductoTransaction(
    productoId: number,
    updateData: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.productoServicio.update({
        where: { id_producto: productoId },
        data: updateData,
        include: this.getProductoIncludes(),
      });

      this.logger.log(
        `Producto actualizado: ${producto.nombre} (ID: ${producto.id_producto})`,
      );
      return producto;
    });
  }

  protected async deleteProductoTransaction(
    empresaId: number,
    productoId: number,
  ) {
    await this.productoValidationService.validateProductoEmpresaExists(
      empresaId,
      productoId,
    );

    return this.prisma.$transaction(async (tx) => {
      // Eliminar registros relacionados primero
      await Promise.all([
        tx.stock.deleteMany({
          where: { id_producto: productoId },
        }),
        tx.disponibilidad.deleteMany({
          where: { id_producto: productoId },
        }),
        tx.atributo.deleteMany({
          where: { id_producto: productoId },
        }),
        tx.historialPrecio.deleteMany({
          where: { id_producto: productoId },
        }),
      ]);

      // Eliminar el producto
      await tx.productoServicio.delete({
        where: { id_producto: productoId },
      });

      this.logger.log(`Producto eliminado: ID ${productoId}`);
      return { message: 'Producto eliminado correctamente' };
    });
  }

  // Métodos que pueden ser sobrescritos por las clases hijas
  protected getProductoIncludes() {
    return {
      categoria: {
        select: {
          id_categoria: true,
          nombre: true,
        },
      },
      subcategoria: {
        select: {
          id_subcategoria: true,
          nombre: true,
        },
      },
      stock: true,
      disponibilidad: true,
      atributos: true,
    };
  }

  protected getDefaultOrderBy() {
    return [{ nombre: 'asc' as const }, { precio: 'asc' as const }];
  }

  // Método para generar estadísticas de productos
  protected async getProductoStats(empresaId: number) {
    const [
      totalProductos,
      totalServicios,
      promedioPrecios,
      productosPorCategoria,
    ] = await Promise.all([
      this.prisma.productoServicio.count({
        where: {
          id_empresa: empresaId,
          es_servicio: false,
        },
      }),
      this.prisma.productoServicio.count({
        where: {
          id_empresa: empresaId,
          es_servicio: true,
        },
      }),
      this.prisma.productoServicio.aggregate({
        where: { id_empresa: empresaId },
        _avg: { precio: true },
        _min: { precio: true },
        _max: { precio: true },
      }),
      this.prisma.productoServicio.groupBy({
        by: ['id_categoria'],
        where: { id_empresa: empresaId },
        _count: { id_producto: true },
      }),
    ]);

    return {
      totalProductos,
      totalServicios,
      total: totalProductos + totalServicios,
      precios: {
        promedio: promedioPrecios._avg.precio,
        minimo: promedioPrecios._min.precio,
        maximo: promedioPrecios._max.precio,
      },
      porCategoria: productosPorCategoria,
    };
  }

  // Método para búsqueda avanzada
  protected async searchProductos(empresaId: number, searchTerm: string) {
    return this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
        OR: [
          {
            nombre: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            categoria: {
              nombre: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            subcategoria: {
              nombre: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            atributos: {
              some: {
                OR: [
                  {
                    nombre: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                  {
                    valor: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      include: this.getProductoIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });
  }
}
