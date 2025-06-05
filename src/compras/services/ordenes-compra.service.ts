import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrdenCompraDto } from '../dto/create-orden-compra.dto';
import { CreateFacturaCompraDto } from '../dto/create-factura-compra.dto';
import { CreatePagoCompraDto } from '../dto/create-pago-compra.dto';
import { Prisma } from '@prisma/client';
import { BaseComprasService, IComprasQuery } from './base-compras.service';
import { ComprasValidationService } from './compras-validation.service';
import {
  ComprasCalculationService,
  IItemCompraCalculation,
} from './compras-calculation.service';

@Injectable()
export class OrdenesCompraService extends BaseComprasService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly comprasValidationService: ComprasValidationService,
    protected readonly comprasCalculationService: ComprasCalculationService,
  ) {
    super(prisma, comprasValidationService, comprasCalculationService);
  }

  async create(createOrdenCompraDto: CreateOrdenCompraDto, empresaId: number) {
    const { items, id_proveedor, numero_orden, fecha_entrega, notas } =
      createOrdenCompraDto;

    try {
      // Validar empresa y proveedor
      await this.comprasValidationService.validateEmpresaExists(empresaId);
      await this.validateProveedorForOperation(id_proveedor, empresaId);

      // Validar número de orden
      this.comprasValidationService.validateNumeroOrden(
        numero_orden,
        empresaId,
      );
      await this.comprasValidationService.validateNumeroOrdenUnico(
        numero_orden,
        empresaId,
      );

      // Validar fecha de entrega
      if (fecha_entrega) {
        this.comprasValidationService.validateFechaEntrega(
          new Date(),
          new Date(fecha_entrega),
        );
      }

      // Validar límites empresariales
      await this.comprasValidationService.validateLimitesEmpresariales(
        empresaId,
        'ORDENES_MENSUALES',
      );

      // Convertir items al formato esperado
      const itemsCalculation: IItemCompraCalculation[] = items.map((item) => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento: 0, // Por defecto sin descuento
      }));

      // Crear orden usando el método base
      const ordenData = {
        id_proveedor,
        numero_orden,
        fecha_entrega,
        notas,
        estado: 'PENDIENTE',
      };

      return this.createDocumentTransaction(
        empresaId,
        ordenData,
        itemsCalculation,
        'ordenCompra',
      );
    } catch (error) {
      this.logger.error(`Error creando orden de compra: ${error.message}`);
      throw error;
    }
  }

  async findAll(empresaId: number, query?: Partial<IComprasQuery>) {
    const comprasQuery: IComprasQuery = {
      empresaId,
      ...query,
    };
    return this.findDocumentosByEmpresa(comprasQuery, 'ordenCompra');
  }

  async findOne(id: number, empresaId: number) {
    return this.findDocumentoById(id, empresaId, 'ordenCompra');
  }

  async update(
    id: number,
    updateOrdenCompraDto: Partial<CreateOrdenCompraDto>,
    empresaId: number,
  ) {
    const ordenActual = await this.findOne(id, empresaId);
    const { items, ...ordenData } = updateOrdenCompraDto;

    // Si hay items, recalcular totales
    let subtotal = (ordenActual as any).subtotal;
    let igv = (ordenActual as any).igv;
    let total = (ordenActual as any).total;

    if (items && items.length > 0) {
      subtotal = new Prisma.Decimal(
        items.reduce(
          (acc, item) =>
            acc + Number(item.cantidad) * Number(item.precio_unitario),
          0,
        ),
      );
      igv = new Prisma.Decimal(Number(subtotal) * 0.18);
      total = new Prisma.Decimal(Number(subtotal) + Number(igv));
    }

    return this.prisma.$transaction(async (prisma) => {
      // Actualizar la orden
      const ordenActualizada = await prisma.ordenCompra.update({
        where: {
          id_orden_compra: id,
        },
        data: {
          ...ordenData,
          subtotal,
          igv,
          total,
        },
        include: {
          items: true,
          proveedor: true,
        },
      });

      // Si hay items, actualizar o crear nuevos
      if (items && items.length > 0) {
        // Eliminar items existentes
        await prisma.itemOrdenCompra.deleteMany({
          where: {
            id_orden_compra: id,
          },
        });

        // Crear nuevos items
        await prisma.itemOrdenCompra.createMany({
          data: items.map((item) => ({
            id_orden_compra: id,
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: new Prisma.Decimal(
              Number(item.cantidad) * Number(item.precio_unitario),
            ),
            fecha_entrega: new Date(),
          })),
        });
      }

      return ordenActualizada;
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.ordenCompra.update({
      where: {
        id_orden_compra: id,
      },
      data: {
        estado: 'cancelada',
      },
    });
  }

  async addFactura(
    id: number,
    facturaData: CreateFacturaCompraDto,
    empresaId: number,
  ) {
    await this.findOne(id, empresaId);

    return this.prisma.facturaCompra.create({
      data: {
        ...facturaData,
        id_orden_compra: id,
      },
      include: {
        orden_compra: true,
      },
    });
  }

  async addPago(
    idFactura: number,
    pagoData: CreatePagoCompraDto,
    empresaId: number,
  ) {
    const factura = await this.prisma.facturaCompra.findFirst({
      where: {
        id_factura_compra: idFactura,
        orden_compra: {
          id_empresa: empresaId,
        },
      },
    });

    if (!factura) {
      throw new NotFoundException(`Factura con ID ${idFactura} no encontrada`);
    }

    return this.prisma.pagoCompra.create({
      data: {
        ...pagoData,
        id_factura_compra: idFactura,
      },
      include: {
        factura_compra: true,
      },
    });
  }

  // Método especializado para recibir orden
  async recibirOrden(id: number, empresaId: number) {
    const orden = await this.findOne(id, empresaId);

    this.comprasValidationService.validateEstadoOrdenCompra(
      (orden as any).estado,
      'RECIBIR',
    );

    const ordenActualizada = await this.prisma.ordenCompra.update({
      where: { id_orden_compra: id },
      data: { estado: 'RECIBIDA' },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        proveedor: true,
      },
    });

    // Actualizar stock después de recibir
    await this.updateStockAfterReceiving(id, empresaId);

    this.logger.log(`Orden de compra ${id} recibida y stock actualizado`);

    return ordenActualizada;
  }

  // Método para generar estadísticas de compras
  async getEstadisticas(
    empresaId: number,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ) {
    return this.generateComprasStats(
      empresaId,
      'ordenCompra',
      fechaDesde,
      fechaHasta,
    );
  }

  // Implementación de métodos abstractos de BaseComprasService
  protected buildWhereClause(
    empresaId: number,
    search?: string,
    proveedorId?: number,
    estado?: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): any {
    const whereClause: any = {
      id_empresa: empresaId,
    };

    if (search) {
      whereClause.OR = [
        {
          numero_orden: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          proveedor: {
            nombre: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          notas: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (proveedorId) {
      whereClause.id_proveedor = proveedorId;
    }

    if (estado) {
      whereClause.estado = estado.toUpperCase();
    }

    if (fechaDesde || fechaHasta) {
      whereClause.fecha_emision = {};
      if (fechaDesde) whereClause.fecha_emision.gte = fechaDesde;
      if (fechaHasta) whereClause.fecha_emision.lte = fechaHasta;
    }

    return whereClause;
  }

  protected async executeQuery(
    whereClause: any,
    skip: number,
    limit: number,
  ): Promise<any[]> {
    return this.prisma.ordenCompra.findMany({
      skip,
      take: limit,
      where: whereClause,
      include: {
        items: {
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
                precio: true,
              },
            },
          },
        },
        proveedor: {
          select: {
            id_proveedor: true,
            nombre: true,
            ruc: true,
          },
        },
        facturas: {
          select: {
            id_factura_compra: true,
            numero_factura: true,
            estado: true,
          },
        },
      },
      orderBy: {
        fecha_emision: 'desc',
      },
    });
  }

  protected async countQuery(whereClause: any): Promise<number> {
    return this.prisma.ordenCompra.count({ where: whereClause });
  }

  protected async executeSingleQuery(whereClause: any): Promise<any> {
    return this.prisma.ordenCompra.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        proveedor: true,
        facturas: {
          include: {
            pagos: true,
          },
        },
      },
    });
  }

  protected async createMainDocument(tx: any, data: any): Promise<any> {
    return tx.ordenCompra.create({
      data,
      select: { id_orden_compra: true },
    });
  }

  protected async createDocumentItems(
    tx: any,
    documentId: number,
    items: any[],
  ): Promise<void> {
    await tx.itemOrdenCompra.createMany({
      data: items.map((item) => ({
        id_orden_compra: documentId,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        estado: 'PENDIENTE',
      })),
    });
  }

  protected async findDocumentWithItems(
    tx: any,
    documentId: number,
  ): Promise<any> {
    return tx.ordenCompra.findUnique({
      where: { id_orden_compra: documentId },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        proveedor: true,
      },
    });
  }
}
