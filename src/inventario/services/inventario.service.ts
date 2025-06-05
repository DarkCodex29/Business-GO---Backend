import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BaseInventarioService,
  IInventarioQuery,
  IMovimientoStock,
} from './base-inventario.service';
import { InventarioValidationService } from './inventario-validation.service';
import { StockManagementService } from '../../productos/services/stock-management.service';
import { TipoMovimientoStock } from '../dto/movimiento-stock.dto';

@Injectable()
export class InventarioService extends BaseInventarioService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly inventarioValidationService: InventarioValidationService,
    protected readonly stockManagementService: StockManagementService,
  ) {
    super(prisma, inventarioValidationService, stockManagementService);
  }

  async getInventario(empresaId: number, query?: Partial<IInventarioQuery>) {
    const inventarioQuery: IInventarioQuery = {
      empresaId,
      ...query,
    };
    return this.findInventarioByEmpresa(inventarioQuery);
  }

  async getProductoInventario(empresaId: number, productoId: number) {
    return this.findProductoInventario(empresaId, productoId);
  }

  async getStock(empresaId: number, productoId: number) {
    try {
      await this.inventarioValidationService.validateProductoFisico(
        productoId,
        empresaId,
      );

      const stock = await this.prisma.stock.findUnique({
        where: { id_producto: productoId },
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

      if (!stock) {
        throw new BadRequestException(
          `No existe registro de stock para el producto ${productoId}`,
        );
      }

      return stock;
    } catch (error) {
      this.logger.error(
        `Error al obtener stock del producto ${productoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getDisponibilidad(empresaId: number, productoId: number) {
    try {
      await this.inventarioValidationService.validateProductoFisico(
        productoId,
        empresaId,
      );

      const disponibilidad = await this.prisma.disponibilidad.findUnique({
        where: { id_producto: productoId },
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

      if (!disponibilidad) {
        throw new BadRequestException(
          `No existe registro de disponibilidad para el producto ${productoId}`,
        );
      }

      return disponibilidad;
    } catch (error) {
      this.logger.error(
        `Error al obtener disponibilidad del producto ${productoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateStock(
    empresaId: number,
    productoId: number,
    cantidad: number,
    motivo: string = 'Ajuste manual',
  ) {
    try {
      const movimiento: IMovimientoStock = {
        productoId,
        cantidad,
        tipo: TipoMovimientoStock.ENTRADA,
        motivo,
      };

      return this.executeMovimientoStock(empresaId, movimiento);
    } catch (error) {
      this.logger.error(
        `Error al actualizar stock del producto ${productoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateDisponibilidad(
    empresaId: number,
    productoId: number,
    cantidadDisponible: number,
  ) {
    try {
      return this.updateDisponibilidadTransaction(
        empresaId,
        productoId,
        cantidadDisponible,
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar disponibilidad del producto ${productoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async movimientoStock(empresaId: number, movimiento: IMovimientoStock) {
    return this.executeMovimientoStock(empresaId, movimiento);
  }

  async getStockBajo(empresaId: number, umbral: number = 10) {
    this.inventarioValidationService.validateUmbralStock(umbral);

    const alertas = await this.getAlertasInventario(empresaId, umbral);
    return alertas.stockBajo;
  }

  async getProductosSinStock(empresaId: number) {
    const alertas = await this.getAlertasInventario(empresaId, 0);
    return alertas.sinStock;
  }

  async getProductosAgotados(empresaId: number) {
    const alertas = await this.getAlertasInventario(empresaId, 10);
    return alertas.agotados;
  }

  async getEstadisticas(empresaId: number) {
    return this.getInventarioStats(empresaId);
  }

  async getAlertas(empresaId: number, umbral: number = 10) {
    return this.getAlertasInventario(empresaId, umbral);
  }

  // Métodos para compatibilidad con API existente
  async findAll(empresaId: number) {
    const result = await this.getInventario(empresaId);
    return result.data;
  }

  async findOne(id: number, empresaId: number) {
    return this.getProductoInventario(empresaId, id);
  }

  async findByEmpresa(empresaId: number) {
    const result = await this.getInventario(empresaId, { limit: 1000 });
    return result.data;
  }
}
