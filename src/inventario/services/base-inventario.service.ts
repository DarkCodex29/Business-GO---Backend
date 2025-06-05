import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventarioValidationService } from './inventario-validation.service';
import { StockManagementService } from '../../productos/services/stock-management.service';
import { TipoMovimientoStock } from '../dto/movimiento-stock.dto';

export interface IInventarioQuery {
  empresaId: number;
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: number;
  stockBajo?: number;
  sinStock?: boolean;
  agotados?: boolean;
}

export interface IInventarioResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IMovimientoStock {
  productoId: number;
  cantidad: number;
  tipo: TipoMovimientoStock;
  motivo: string;
  usuarioId?: number;
}

@Injectable()
export abstract class BaseInventarioService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly inventarioValidationService: InventarioValidationService,
    protected readonly stockManagementService: StockManagementService,
  ) {}

  // Template Method Pattern - Define el algoritmo general para consultas de inventario
  protected async findInventarioByEmpresa(
    query: IInventarioQuery,
  ): Promise<IInventarioResponse<any>> {
    const {
      empresaId,
      page = 1,
      limit = 10,
      search,
      categoriaId,
      stockBajo,
      sinStock,
      agotados,
    } = query;
    const skip = (page - 1) * limit;

    // Construir filtros dinámicos
    const whereClause: any = {
      id_empresa: empresaId,
      es_servicio: false, // Solo productos físicos en inventario
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

    // Filtros específicos de inventario
    if (stockBajo !== undefined) {
      whereClause.stock = {
        cantidad: {
          lte: stockBajo,
        },
      };
    }

    if (sinStock) {
      whereClause.stock = {
        cantidad: 0,
      };
    }

    if (agotados) {
      whereClause.disponibilidad = {
        cantidad_disponible: 0,
      };
    }

    // Ejecutar consultas en paralelo para optimizar rendimiento
    const [productos, total] = await Promise.all([
      this.prisma.productoServicio.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: this.getInventarioIncludes(),
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

  protected async findProductoInventario(
    empresaId: number,
    productoId: number,
  ) {
    await this.inventarioValidationService.validateProductoFisico(
      productoId,
      empresaId,
    );

    return this.prisma.productoServicio.findUnique({
      where: { id_producto: productoId },
      include: this.getInventarioIncludes(),
    });
  }

  protected async executeMovimientoStock(
    empresaId: number,
    movimiento: IMovimientoStock,
  ) {
    const { productoId, cantidad, tipo, motivo, usuarioId } = movimiento;

    // Validaciones
    await this.inventarioValidationService.validateMovimientoStock(
      productoId,
      empresaId,
      cantidad,
      tipo,
    );
    this.inventarioValidationService.validateTipoMovimiento(tipo);
    this.inventarioValidationService.validateMotivoMovimiento(motivo);

    return this.prisma.$transaction(async (tx) => {
      // Obtener stock actual
      const stockActual = await tx.stock.findUnique({
        where: { id_producto: productoId },
        include: {
          producto: {
            select: { nombre: true },
          },
        },
      });

      if (!stockActual) {
        throw new Error(
          `No existe registro de stock para el producto ${productoId}`,
        );
      }

      // Calcular nueva cantidad según el tipo de movimiento
      let nuevaCantidad: number;
      switch (tipo) {
        case TipoMovimientoStock.ENTRADA:
          nuevaCantidad = stockActual.cantidad + cantidad;
          break;
        case TipoMovimientoStock.SALIDA:
          nuevaCantidad = stockActual.cantidad - cantidad;
          break;
        default:
          throw new Error(`Tipo de movimiento no válido: ${tipo}`);
      }

      // Actualizar stock
      const stockActualizado = await tx.stock.update({
        where: { id_producto: productoId },
        data: { cantidad: nuevaCantidad },
        include: {
          producto: {
            select: { nombre: true },
          },
        },
      });

      // Registrar el movimiento en historial (si existe tabla de movimientos)
      // TODO: Crear tabla de movimientos de inventario para auditoría

      this.logger.log(
        `Movimiento de stock ${tipo}: ${stockActual.cantidad} → ${nuevaCantidad} (${tipo === TipoMovimientoStock.ENTRADA ? '+' : '-'}${cantidad}) para producto "${stockActual.producto.nombre}". Motivo: ${motivo}`,
      );

      return {
        ...stockActualizado,
        movimiento: {
          tipo,
          cantidadAnterior: stockActual.cantidad,
          cantidadNueva: nuevaCantidad,
          diferencia: nuevaCantidad - stockActual.cantidad,
          motivo,
        },
      };
    });
  }

  protected async updateDisponibilidadTransaction(
    empresaId: number,
    productoId: number,
    cantidadDisponible: number,
  ) {
    // Validaciones
    await this.inventarioValidationService.validateDisponibilidadUpdate(
      productoId,
      empresaId,
      cantidadDisponible,
    );

    return this.prisma.$transaction(async (tx) => {
      const disponibilidadActual = await tx.disponibilidad.findUnique({
        where: { id_producto: productoId },
        include: {
          producto: {
            select: { nombre: true },
          },
        },
      });

      const disponibilidad = await tx.disponibilidad.upsert({
        where: { id_producto: productoId },
        update: { cantidad_disponible: cantidadDisponible },
        create: {
          id_producto: productoId,
          cantidad_disponible: cantidadDisponible,
        },
        include: {
          producto: {
            select: { nombre: true },
          },
        },
      });

      this.logger.log(
        `Disponibilidad actualizada: ${disponibilidadActual?.cantidad_disponible || 0} → ${cantidadDisponible} para producto "${disponibilidad.producto.nombre}"`,
      );

      return disponibilidad;
    });
  }

  // Métodos que pueden ser sobrescritos por las clases hijas
  protected getInventarioIncludes() {
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
    };
  }

  protected getDefaultOrderBy() {
    return [
      { nombre: 'asc' as const },
      { stock: { cantidad: 'asc' as const } },
    ];
  }

  // Método para generar estadísticas de inventario
  protected async getInventarioStats(empresaId: number) {
    const [
      totalProductos,
      productosConStock,
      productosSinStock,
      productosAgotados,
      valorTotalInventario,
      stockBajo,
    ] = await Promise.all([
      this.prisma.productoServicio.count({
        where: {
          id_empresa: empresaId,
          es_servicio: false,
        },
      }),
      this.prisma.stock.count({
        where: {
          cantidad: { gt: 0 },
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
      }),
      this.prisma.stock.count({
        where: {
          cantidad: 0,
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
      }),
      this.prisma.disponibilidad.count({
        where: {
          cantidad_disponible: 0,
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
        _sum: { cantidad: true },
      }),
      this.prisma.stock.count({
        where: {
          cantidad: { lte: 10 },
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
      }),
    ]);

    return {
      totalProductos,
      productosConStock,
      productosSinStock,
      productosAgotados,
      stockBajo,
      totalUnidades: valorTotalInventario._sum.cantidad || 0,
      porcentajeConStock:
        totalProductos > 0
          ? Math.round((productosConStock / totalProductos) * 100)
          : 0,
    };
  }

  // Método para alertas de inventario
  protected async getAlertasInventario(empresaId: number, umbral: number = 10) {
    this.inventarioValidationService.validateUmbralStock(umbral);

    const [stockBajo, sinStock, agotados] = await Promise.all([
      this.prisma.stock.findMany({
        where: {
          cantidad: { lte: umbral, gt: 0 },
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
        include: {
          producto: {
            select: { nombre: true, precio: true },
          },
        },
        orderBy: { cantidad: 'asc' },
      }),
      this.prisma.stock.findMany({
        where: {
          cantidad: 0,
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
        include: {
          producto: {
            select: { nombre: true, precio: true },
          },
        },
      }),
      this.prisma.disponibilidad.findMany({
        where: {
          cantidad_disponible: 0,
          producto: {
            id_empresa: empresaId,
            es_servicio: false,
          },
        },
        include: {
          producto: {
            select: { nombre: true, precio: true },
          },
        },
      }),
    ]);

    return {
      stockBajo: {
        count: stockBajo.length,
        productos: stockBajo,
      },
      sinStock: {
        count: sinStock.length,
        productos: sinStock,
      },
      agotados: {
        count: agotados.length,
        productos: agotados,
      },
    };
  }
}
