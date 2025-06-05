import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComprasValidationService } from './compras-validation.service';
import {
  ComprasCalculationService,
  IItemCompraCalculation,
} from './compras-calculation.service';

export interface IComprasQuery {
  empresaId: number;
  page?: number;
  limit?: number;
  search?: string;
  proveedorId?: number;
  estado?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export interface IComprasResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IComprasStats {
  totalDocumentos: number;
  montoTotal: number;
  documentosPendientes: number;
  documentosCompletados: number;
  promedioMonto: number;
  proveedoresUnicos: number;
}

@Injectable()
export abstract class BaseComprasService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly comprasValidationService: ComprasValidationService,
    protected readonly comprasCalculationService: ComprasCalculationService,
  ) {}

  // Template Method Pattern - Define el algoritmo general para consultas de compras
  protected async findDocumentosByEmpresa<T>(
    query: IComprasQuery,
    documentType: 'ordenCompra' | 'facturaCompra' | 'pagoCompra',
  ): Promise<IComprasResponse<T>> {
    const {
      empresaId,
      page = 1,
      limit = 10,
      search,
      proveedorId,
      estado,
      fechaDesde,
      fechaHasta,
    } = query;
    const skip = (page - 1) * limit;

    // Validar empresa
    await this.comprasValidationService.validateEmpresaExists(empresaId);

    // Construir filtros dinámicos
    const whereClause = this.buildWhereClause(
      empresaId,
      search,
      proveedorId,
      estado,
      fechaDesde,
      fechaHasta,
      documentType,
    );

    // Ejecutar consultas en paralelo para optimizar rendimiento
    const [documentos, total] = await Promise.all([
      this.executeQuery(whereClause, skip, limit, documentType),
      this.countQuery(whereClause, documentType),
    ]);

    return {
      data: documentos as T[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  protected async findDocumentoById<T>(
    id: number,
    empresaId: number,
    documentType: 'ordenCompra' | 'facturaCompra' | 'pagoCompra',
  ): Promise<T> {
    await this.comprasValidationService.validateEmpresaExists(empresaId);

    const whereClause = this.buildSingleDocumentWhere(
      id,
      empresaId,
      documentType,
    );
    const documento = await this.executeSingleQuery(whereClause, documentType);

    if (!documento) {
      throw new Error(
        `${this.getDocumentTypeName(documentType)} con ID ${id} no encontrado`,
      );
    }

    return documento as T;
  }

  // Método para validar items antes de crear/actualizar documentos
  protected async validateDocumentItems(
    items: IItemCompraCalculation[],
    empresaId: number,
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new Error('Debe incluir al menos un item en el documento');
    }

    this.comprasValidationService.validateItemsOrden(items);

    // Validar cada item en paralelo
    const validationPromises = items.map(async (item) => {
      // Validar que el producto existe y pertenece a la empresa
      await this.comprasValidationService.validateProductoEmpresa(
        item.id_producto,
        empresaId,
      );

      // Validar cantidad
      this.comprasValidationService.validateCantidad(item.cantidad, 'item');

      // Validar precio
      this.comprasValidationService.validatePrecio(
        item.precio_unitario,
        'item',
      );

      // Validar stock máximo si aplica
      await this.comprasValidationService.validateStockSuficiente(
        item.id_producto,
        item.cantidad,
      );
    });

    await Promise.all(validationPromises);
  }

  // Método para crear documento con transacción
  protected async createDocumentTransaction<T>(
    empresaId: number,
    data: any,
    items: IItemCompraCalculation[],
    documentType: 'ordenCompra' | 'facturaCompra',
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Validar items
      await this.validateDocumentItems(items, empresaId);

      // Calcular totales
      const calculation = await this.getCalculationMethod(documentType)(items);

      // Validar cálculos
      if (!this.comprasCalculationService.validateCalculation(calculation)) {
        throw new Error('Error en los cálculos del documento');
      }

      // Validar monto total
      this.comprasValidationService.validateMontoTotal(
        Number(calculation.total),
      );

      // Crear el documento principal
      const documentData = {
        ...data,
        id_empresa: empresaId,
        subtotal: calculation.subtotal,
        igv: calculation.igv,
        total: calculation.total,
      };

      const documento = await this.createMainDocument(
        tx,
        documentData,
        documentType,
      );

      // Crear los items
      await this.createDocumentItems(
        tx,
        documento.id,
        calculation.items,
        documentType,
      );

      // Log de la operación
      this.logger.log(
        `${this.getDocumentTypeName(documentType)} creado: ID ${documento.id}, Total: S/ ${calculation.total.toFixed(2)}`,
      );

      // Retornar documento completo
      return this.findDocumentWithItems(
        tx,
        documento.id,
        documentType,
      ) as Promise<T>;
    });
  }

  // Método para actualizar documento con transacción
  protected async updateDocumentTransaction<T>(
    id: number,
    empresaId: number,
    data: any,
    documentType: 'ordenCompra' | 'facturaCompra',
    items?: IItemCompraCalculation[],
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Verificar que el documento existe
      const documentoExistente = await this.findDocumentoById(
        id,
        empresaId,
        documentType,
      );

      // Validar estado para modificación
      this.validateDocumentForUpdate(documentoExistente, documentType);

      let updateData = { ...data };

      // Si hay nuevos items, recalcular
      if (items) {
        await this.validateDocumentItems(items, empresaId);

        const calculation =
          await this.getCalculationMethod(documentType)(items);

        if (!this.comprasCalculationService.validateCalculation(calculation)) {
          throw new Error('Error en los cálculos del documento');
        }

        // Validar monto total
        this.comprasValidationService.validateMontoTotal(
          Number(calculation.total),
        );

        updateData = {
          ...updateData,
          subtotal: calculation.subtotal,
          igv: calculation.igv,
          total: calculation.total,
        };

        // Eliminar items existentes y crear nuevos
        await this.deleteDocumentItems(tx, id, documentType);
        await this.createDocumentItems(tx, id, calculation.items, documentType);
      }

      // Actualizar documento principal
      await this.updateMainDocument(tx, id, updateData, documentType);

      this.logger.log(
        `${this.getDocumentTypeName(documentType)} actualizado: ID ${id}`,
      );

      return this.findDocumentWithItems(tx, id, documentType) as Promise<T>;
    });
  }

  // Método para generar estadísticas
  protected async generateComprasStats(
    empresaId: number,
    documentType: 'ordenCompra' | 'facturaCompra' | 'pagoCompra',
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<IComprasStats> {
    const whereClause = this.buildStatsWhereClause(
      empresaId,
      documentType,
      fechaDesde,
      fechaHasta,
    );

    const [stats, proveedoresUnicos] = await Promise.all([
      this.executeStatsQuery(whereClause, documentType),
      this.countUniqueProviders(whereClause, documentType),
    ]);

    return {
      totalDocumentos: stats._count._all || 0,
      montoTotal: Number(stats._sum.total || 0),
      documentosPendientes: await this.countByStatus(
        whereClause,
        'PENDIENTE',
        documentType,
      ),
      documentosCompletados: await this.countByStatus(
        whereClause,
        'RECIBIDA',
        documentType,
      ),
      promedioMonto: Number(stats._avg.total || 0),
      proveedoresUnicos,
    };
  }

  // Método para validar proveedor antes de operaciones
  protected async validateProveedorForOperation(
    proveedorId: number,
    empresaId: number,
  ): Promise<void> {
    await this.comprasValidationService.validateProveedorEmpresa(
      proveedorId,
      empresaId,
    );
    await this.comprasValidationService.validateProveedorActivo(proveedorId);
  }

  // Método para generar número de orden automático
  protected async generateNumeroOrden(empresaId: number): Promise<string> {
    const año = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');

    // Contar órdenes del mes actual
    const inicioMes = new Date(año, new Date().getMonth(), 1);
    const finMes = new Date(año, new Date().getMonth() + 1, 0);

    const ordenesDelMes = await this.prisma.ordenCompra.count({
      where: {
        id_empresa: empresaId,
        fecha_emision: {
          gte: inicioMes,
          lte: finMes,
        },
      },
    });

    const numeroSecuencial = String(ordenesDelMes + 1).padStart(4, '0');
    return `OC-${año}-${numeroSecuencial}`;
  }

  // Método para actualizar stock después de recibir orden
  protected async updateStockAfterReceiving(
    ordenId: number,
    empresaId: number,
  ): Promise<void> {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id_orden_compra: ordenId },
      include: {
        items: {
          include: {
            producto: {
              select: { es_servicio: true },
            },
          },
        },
      },
    });

    if (!orden) return;

    // Actualizar stock solo para productos físicos
    const updatePromises = orden.items
      .filter((item) => !item.producto.es_servicio)
      .map(async (item) => {
        // Incrementar stock disponible
        await this.prisma.disponibilidad.upsert({
          where: { id_producto: item.id_producto },
          update: {
            cantidad_disponible: {
              increment: item.cantidad,
            },
          },
          create: {
            id_producto: item.id_producto,
            cantidad_disponible: item.cantidad,
          },
        });

        // Actualizar stock total
        await this.prisma.stock.upsert({
          where: { id_producto: item.id_producto },
          update: {
            cantidad: {
              increment: item.cantidad,
            },
          },
          create: {
            id_producto: item.id_producto,
            cantidad: item.cantidad,
          },
        });
      });

    await Promise.all(updatePromises);

    this.logger.log(
      `Stock actualizado para orden de compra ${ordenId}: ${orden.items.length} productos`,
    );
  }

  // Métodos abstractos que deben implementar las clases hijas
  protected abstract buildWhereClause(
    empresaId: number,
    search?: string,
    proveedorId?: number,
    estado?: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
    documentType?: string,
  ): any;

  protected abstract executeQuery(
    whereClause: any,
    skip: number,
    limit: number,
    documentType: string,
  ): Promise<any[]>;

  protected abstract countQuery(
    whereClause: any,
    documentType: string,
  ): Promise<number>;

  protected abstract executeSingleQuery(
    whereClause: any,
    documentType: string,
  ): Promise<any>;

  protected abstract createMainDocument(
    tx: any,
    data: any,
    documentType: string,
  ): Promise<any>;

  protected abstract createDocumentItems(
    tx: any,
    documentId: number,
    items: any[],
    documentType: string,
  ): Promise<void>;

  protected abstract findDocumentWithItems(
    tx: any,
    documentId: number,
    documentType: string,
  ): Promise<any>;

  // Métodos auxiliares
  private buildSingleDocumentWhere(
    id: number,
    empresaId: number,
    documentType: 'ordenCompra' | 'facturaCompra' | 'pagoCompra',
  ): any {
    const idField = this.getIdField(documentType);
    const baseWhere = { [idField]: id };

    // Para órdenes de compra, validar directamente la empresa
    if (documentType === 'ordenCompra') {
      return { ...baseWhere, id_empresa: empresaId };
    }

    // Para facturas y pagos, validar a través de la orden de compra
    return {
      ...baseWhere,
      orden_compra: { id_empresa: empresaId },
    };
  }

  private getIdField(documentType: string): string {
    switch (documentType) {
      case 'ordenCompra':
        return 'id_orden_compra';
      case 'facturaCompra':
        return 'id_factura_compra';
      case 'pagoCompra':
        return 'id_pago_compra';
      default:
        throw new Error(`Tipo de documento no válido: ${documentType}`);
    }
  }

  private getDocumentTypeName(documentType: string): string {
    switch (documentType) {
      case 'ordenCompra':
        return 'Orden de Compra';
      case 'facturaCompra':
        return 'Factura de Compra';
      case 'pagoCompra':
        return 'Pago de Compra';
      default:
        return 'Documento';
    }
  }

  private getCalculationMethod(documentType: string) {
    switch (documentType) {
      case 'ordenCompra':
        return this.comprasCalculationService.calculateOrdenCompra.bind(
          this.comprasCalculationService,
        );
      case 'facturaCompra':
        return this.comprasCalculationService.calculateFacturaCompra.bind(
          this.comprasCalculationService,
        );
      default:
        throw new Error(`Tipo de documento no válido: ${documentType}`);
    }
  }

  private validateDocumentForUpdate(
    documento: any,
    documentType: string,
  ): void {
    if (documentType === 'ordenCompra') {
      this.comprasValidationService.validateEstadoOrdenCompra(
        documento.estado,
        'MODIFICAR',
      );
    }
  }

  private async deleteDocumentItems(
    tx: any,
    documentId: number,
    documentType: string,
  ): Promise<void> {
    if (documentType === 'ordenCompra') {
      await tx.itemOrdenCompra.deleteMany({
        where: { id_orden_compra: documentId },
      });
    }
  }

  private async updateMainDocument(
    tx: any,
    id: number,
    data: any,
    documentType: string,
  ): Promise<void> {
    if (documentType === 'ordenCompra') {
      await tx.ordenCompra.update({
        where: { id_orden_compra: id },
        data,
      });
    } else if (documentType === 'facturaCompra') {
      await tx.facturaCompra.update({
        where: { id_factura_compra: id },
        data,
      });
    }
  }

  private buildStatsWhereClause(
    empresaId: number,
    documentType: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): any {
    const whereClause: any = { id_empresa: empresaId };

    if (fechaDesde || fechaHasta) {
      whereClause.fecha_emision = {};
      if (fechaDesde) whereClause.fecha_emision.gte = fechaDesde;
      if (fechaHasta) whereClause.fecha_emision.lte = fechaHasta;
    }

    return whereClause;
  }

  private async executeStatsQuery(
    whereClause: any,
    documentType: string,
  ): Promise<any> {
    if (documentType === 'ordenCompra') {
      return this.prisma.ordenCompra.aggregate({
        where: whereClause,
        _count: { _all: true },
        _sum: { total: true },
        _avg: { total: true },
      });
    }
    return { _count: { _all: 0 }, _sum: { total: 0 }, _avg: { total: 0 } };
  }

  private async countUniqueProviders(
    whereClause: any,
    documentType: string,
  ): Promise<number> {
    if (documentType === 'ordenCompra') {
      const result = await this.prisma.ordenCompra.groupBy({
        by: ['id_proveedor'],
        where: whereClause,
      });
      return result.length;
    }
    return 0;
  }

  private async countByStatus(
    whereClause: any,
    status: string,
    documentType: string,
  ): Promise<number> {
    if (documentType === 'ordenCompra') {
      return this.prisma.ordenCompra.count({
        where: { ...whereClause, estado: status },
      });
    }
    return 0;
  }
}
