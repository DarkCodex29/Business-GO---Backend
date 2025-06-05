import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCotizacionDto } from '../dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from '../dto/update-cotizacion.dto';
import { BaseVentasService, IVentasQuery } from './base-ventas.service';
import { VentasValidationService } from './ventas-validation.service';
import {
  VentasCalculationService,
  IItemCalculation,
} from './ventas-calculation.service';

@Injectable()
export class CotizacionesService extends BaseVentasService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly ventasValidationService: VentasValidationService,
    protected readonly ventasCalculationService: VentasCalculationService,
  ) {
    super(prisma, ventasValidationService, ventasCalculationService);
  }

  async create(empresaId: number, createCotizacionDto: CreateCotizacionDto) {
    const { id_cliente, items, fecha_emision, fecha_validez, estado, notas } =
      createCotizacionDto;

    try {
      // Validar empresa y cliente
      await this.ventasValidationService.validateEmpresaExists(empresaId);
      await this.ventasValidationService.validateClienteEmpresa(
        id_cliente,
        empresaId,
      );

      // Validar fechas
      this.ventasValidationService.validateFechaValidez(
        new Date(fecha_emision),
        new Date(fecha_validez),
      );

      // Validar estado
      this.ventasValidationService.validateEstadoCotizacion(estado, 'CREAR');

      // Convertir items al formato esperado
      const itemsCalculation: IItemCalculation[] = items.map((item) => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento: item.descuento,
      }));

      // Crear cotización usando el método base
      const cotizacionData = {
        id_cliente,
        fecha_emision: new Date(fecha_emision),
        fecha_validez: new Date(fecha_validez),
        estado: estado.toUpperCase(),
        notas,
      };

      return this.createDocumentTransaction(
        empresaId,
        cotizacionData,
        itemsCalculation,
        'cotizacion',
      );
    } catch (error) {
      this.logger.error(`Error creando cotización: ${error.message}`);
      throw error;
    }
  }

  async findAll(empresaId: number, query?: Partial<IVentasQuery>) {
    const ventasQuery: IVentasQuery = {
      empresaId,
      ...query,
    };
    return this.findDocumentosByEmpresa(ventasQuery, 'cotizacion');
  }

  async findOne(id: number, empresaId: number) {
    return this.findDocumentoById(id, empresaId, 'cotizacion');
  }

  async update(
    id: number,
    empresaId: number,
    updateCotizacionDto: UpdateCotizacionDto,
  ) {
    const cotizacionExistente = await this.findOne(id, empresaId);

    if ((cotizacionExistente as any).estado === 'CONVERTIDA') {
      throw new BadRequestException(
        'No se puede modificar una cotización convertida en orden de venta',
      );
    }

    const { items, ...rest } = updateCotizacionDto;

    // Si hay nuevos items, recalcular totales
    let subtotal = new Decimal(0);
    let descuento = new Decimal(0);
    let igv = new Decimal(0);
    let total = new Decimal(0);

    if (items) {
      for (const item of items) {
        const producto = await this.prisma.productoServicio.findFirst({
          where: {
            id_producto: Number(item.id_producto),
            empresa: {
              id_empresa: empresaId,
            },
          },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto con ID ${item.id_producto} no encontrado o no pertenece a la empresa`,
          );
        }

        const subtotal_item = new Decimal(item.cantidad).mul(
          item.precio_unitario,
        );
        const descuento_item = subtotal_item.mul(
          new Decimal(item.descuento || 0).div(100),
        );

        subtotal = subtotal.add(subtotal_item);
        descuento = descuento.add(descuento_item);
      }

      igv = subtotal.sub(descuento).mul(new Decimal(0.18));
      total = subtotal.sub(descuento).add(igv);
    }

    // Actualizar la cotización
    return this.prisma.cotizacion.update({
      where: { id_cotizacion: id },
      data: {
        fecha_emision: rest.fecha_emision,
        fecha_validez: rest.fecha_validez,
        subtotal,
        descuento,
        igv,
        total,
        estado: rest.estado,
        notas: rest.notas,
        items: items
          ? {
              deleteMany: {},
              create: items.map((item) => {
                const subtotal_item = new Decimal(item.cantidad).mul(
                  item.precio_unitario,
                );
                const descuento_item = subtotal_item.mul(
                  new Decimal(item.descuento || 0).div(100),
                );
                return {
                  producto: {
                    connect: { id_producto: Number(item.id_producto) },
                  },
                  cantidad: item.cantidad,
                  precio_unitario: item.precio_unitario,
                  descuento: item.descuento || 0,
                  subtotal: subtotal_item.sub(descuento_item),
                };
              }),
            }
          : undefined,
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const cotizacion = await this.findOne(id, empresaId);

    this.ventasValidationService.validateEstadoCotizacion(
      (cotizacion as any).estado,
      'ELIMINAR',
    );

    return this.prisma.cotizacion.delete({
      where: { id_cotizacion: id },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        empresa: true,
        cliente: true,
      },
    });
  }

  // Implementación de métodos abstractos de BaseVentasService
  protected buildWhereClause(
    empresaId: number,
    search?: string,
    clienteId?: number,
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
          cliente: {
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

    if (clienteId) {
      whereClause.id_cliente = clienteId;
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
    return this.prisma.cotizacion.findMany({
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
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fecha_emision: 'desc',
      },
    });
  }

  protected async countQuery(whereClause: any): Promise<number> {
    return this.prisma.cotizacion.count({ where: whereClause });
  }

  protected async executeSingleQuery(whereClause: any): Promise<any> {
    return this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        cliente: true,
      },
    });
  }

  protected async createMainDocument(tx: any, data: any): Promise<any> {
    return tx.cotizacion.create({
      data,
      select: { id_cotizacion: true },
    });
  }

  protected async createDocumentItems(
    tx: any,
    documentId: number,
    items: any[],
  ): Promise<void> {
    await tx.itemCotizacion.createMany({
      data: items.map((item) => ({
        id_cotizacion: documentId,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento: item.descuento,
        subtotal: item.subtotal,
      })),
    });
  }

  protected async findDocumentWithItems(
    tx: any,
    documentId: number,
  ): Promise<any> {
    return tx.cotizacion.findUnique({
      where: { id_cotizacion: documentId },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        cliente: true,
      },
    });
  }
}
