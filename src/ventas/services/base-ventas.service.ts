import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VentasValidationService } from './ventas-validation.service';
import {
  VentasCalculationService,
  IItemCalculation,
} from './ventas-calculation.service';

export interface IVentasQuery {
  empresaId: number;
  page?: number;
  limit?: number;
  search?: string;
  clienteId?: number;
  estado?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export interface IVentasResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IVentasStats {
  totalDocumentos: number;
  montoTotal: number;
  documentosPendientes: number;
  documentosCompletados: number;
  promedioMonto: number;
  clientesUnicos: number;
}

@Injectable()
export abstract class BaseVentasService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly ventasValidationService: VentasValidationService,
    protected readonly ventasCalculationService: VentasCalculationService,
  ) {}

  // Template Method Pattern - Define el algoritmo general para consultas de ventas
  protected async findDocumentosByEmpresa<T>(
    query: IVentasQuery,
    documentType: 'cotizacion' | 'ordenVenta' | 'factura',
  ): Promise<IVentasResponse<T>> {
    const {
      empresaId,
      page = 1,
      limit = 10,
      search,
      clienteId,
      estado,
      fechaDesde,
      fechaHasta,
    } = query;
    const skip = (page - 1) * limit;

    // Validar empresa
    await this.ventasValidationService.validateEmpresaExists(empresaId);

    // Construir filtros dinámicos
    const whereClause = this.buildWhereClause(
      empresaId,
      search,
      clienteId,
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
    documentType: 'cotizacion' | 'ordenVenta' | 'factura',
  ): Promise<T> {
    await this.ventasValidationService.validateEmpresaExists(empresaId);

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
    items: IItemCalculation[],
    empresaId: number,
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new Error('Debe incluir al menos un item en el documento');
    }

    if (items.length > 100) {
      throw new Error('No se pueden incluir más de 100 items por documento');
    }

    // Validar cada item en paralelo
    const validationPromises = items.map(async (item) => {
      // Validar que el producto existe y pertenece a la empresa
      await this.ventasValidationService.validateProductoEmpresa(
        item.id_producto,
        empresaId,
      );

      // Validar cantidad
      this.ventasValidationService.validateCantidad(item.cantidad, 'item');

      // Validar precio
      this.ventasValidationService.validatePrecio(item.precio_unitario, 'item');

      // Validar stock disponible
      await this.ventasValidationService.validateStockDisponible(
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
    items: IItemCalculation[],
    documentType: 'cotizacion' | 'ordenVenta' | 'factura',
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Validar items
      await this.validateDocumentItems(items, empresaId);

      // Calcular totales
      const calculation = await this.getCalculationMethod(documentType)(items);

      // Validar cálculos
      if (!this.ventasCalculationService.validateCalculation(calculation)) {
        throw new Error('Error en los cálculos del documento');
      }

      // Crear el documento principal
      const documentData = {
        ...data,
        id_empresa: empresaId,
        subtotal: calculation.subtotal,
        descuento: calculation.descuento,
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
    documentType: 'cotizacion' | 'ordenVenta' | 'factura',
    items?: IItemCalculation[],
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

        if (!this.ventasCalculationService.validateCalculation(calculation)) {
          throw new Error('Error en los cálculos del documento');
        }

        updateData = {
          ...updateData,
          subtotal: calculation.subtotal,
          descuento: calculation.descuento,
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
  protected async generateVentasStats(
    empresaId: number,
    documentType: 'cotizacion' | 'ordenVenta' | 'factura',
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<IVentasStats> {
    const whereClause = this.buildStatsWhereClause(
      empresaId,
      documentType,
      fechaDesde,
      fechaHasta,
    );

    const [stats, clientesUnicos] = await Promise.all([
      this.executeStatsQuery(whereClause, documentType),
      this.countUniqueClients(whereClause, documentType),
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
        'COMPLETADO',
        documentType,
      ),
      promedioMonto: Number(stats._avg.total || 0),
      clientesUnicos,
    };
  }

  // Métodos abstractos que deben implementar las clases hijas
  protected abstract buildWhereClause(
    empresaId: number,
    search?: string,
    clienteId?: number,
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
    documentType: 'cotizacion' | 'ordenVenta' | 'factura',
  ): any {
    const idField = this.getIdField(documentType);
    return {
      [idField]: id,
      id_empresa: empresaId,
    };
  }

  private getIdField(documentType: string): string {
    switch (documentType) {
      case 'cotizacion':
        return 'id_cotizacion';
      case 'ordenVenta':
        return 'id_orden_venta';
      case 'factura':
        return 'id_factura';
      default:
        throw new Error(`Tipo de documento no válido: ${documentType}`);
    }
  }

  private getDocumentTypeName(documentType: string): string {
    switch (documentType) {
      case 'cotizacion':
        return 'Cotización';
      case 'ordenVenta':
        return 'Orden de Venta';
      case 'factura':
        return 'Factura';
      default:
        return 'Documento';
    }
  }

  private getCalculationMethod(documentType: string) {
    switch (documentType) {
      case 'cotizacion':
        return this.ventasCalculationService.calculateCotizacion.bind(
          this.ventasCalculationService,
        );
      case 'ordenVenta':
        return this.ventasCalculationService.calculateOrdenVenta.bind(
          this.ventasCalculationService,
        );
      case 'factura':
        return this.ventasCalculationService.calculateFactura.bind(
          this.ventasCalculationService,
        );
      default:
        throw new Error(`Tipo de documento no válido: ${documentType}`);
    }
  }

  private validateDocumentForUpdate(
    documento: any,
    documentType: string,
  ): void {
    // Implementar validaciones específicas por tipo de documento
    // Este método puede ser sobrescrito por las clases hijas
  }

  private async deleteDocumentItems(
    tx: any,
    documentId: number,
    documentType: string,
  ): Promise<void> {
    // Implementar eliminación de items según el tipo de documento
    // Este método debe ser implementado por las clases hijas
  }

  private async updateMainDocument(
    tx: any,
    id: number,
    data: any,
    documentType: string,
  ): Promise<void> {
    // Implementar actualización del documento principal
    // Este método debe ser implementado por las clases hijas
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
    // Implementar consulta de estadísticas según el tipo de documento
    // Este método debe ser implementado por las clases hijas
    return {};
  }

  private async countUniqueClients(
    whereClause: any,
    documentType: string,
  ): Promise<number> {
    // Implementar conteo de clientes únicos
    // Este método debe ser implementado por las clases hijas
    return 0;
  }

  private async countByStatus(
    whereClause: any,
    status: string,
    documentType: string,
  ): Promise<number> {
    // Implementar conteo por estado
    // Este método debe ser implementado por las clases hijas
    return 0;
  }
}
