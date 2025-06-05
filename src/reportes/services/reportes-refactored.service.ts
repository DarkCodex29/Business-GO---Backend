import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReporteDto, TipoReporte } from '../dto/create-reporte.dto';
import { ReporteParamsDto } from '../dto/reporte-params.dto';
import { BaseReportesService, IReporteQuery } from './base-reportes.service';
import { ReportesValidationService } from './reportes-validation.service';
import { ReportesCalculationService } from './reportes-calculation.service';

@Injectable()
export class ReportesRefactoredService extends BaseReportesService {
  protected readonly logger = new Logger(ReportesRefactoredService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly reportesValidationService: ReportesValidationService,
    protected readonly reportesCalculationService: ReportesCalculationService,
  ) {
    super(prisma, reportesValidationService, reportesCalculationService);
  }

  async create(createReporteDto: CreateReporteDto, usuarioId: number) {
    this.logger.log(
      `Creando reporte ${createReporteDto.tipo_reporte} para usuario ${usuarioId}`,
    );

    // Obtener el usuario y su empresa usando validación especializada
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: usuarioId,
        fecha_fin: null, // Usuario activo
      },
      include: {
        empresa: { select: { id_empresa: true, nombre: true, estado: true } },
      },
    });

    if (!usuarioEmpresa) {
      throw new ForbiddenException(
        'Usuario no tiene una empresa asociada activa',
      );
    }

    const empresaId = usuarioEmpresa.empresa_id;

    // Validaciones usando servicios especializados
    await this.reportesValidationService.validateEmpresaExists(empresaId);
    this.reportesValidationService.validateTipoReporte(
      createReporteDto.tipo_reporte,
    );
    this.reportesValidationService.validateParametrosReporte(
      createReporteDto.tipo_reporte,
      createReporteDto.parametros,
    );

    if (createReporteDto.formato) {
      this.reportesValidationService.validateFormatoReporte(
        createReporteDto.formato,
      );
    }

    await this.reportesValidationService.validatePermisoReporte(
      usuarioId,
      empresaId,
      createReporteDto.tipo_reporte,
    );

    const reporte = await this.prisma.reporte.create({
      data: {
        ...createReporteDto,
        id_usuario: usuarioId,
        id_empresa: empresaId,
        formato: createReporteDto.formato || 'pdf',
      },
      include: {
        empresa: { select: { nombre: true } },
        usuario: { select: { nombre: true, email: true } },
      },
    });

    this.logger.log(`Reporte ${reporte.id_reporte} creado exitosamente`);
    return reporte;
  }

  async findAll(empresaId: number) {
    await this.reportesValidationService.validateEmpresaExists(empresaId);

    return this.prisma.reporte.findMany({
      where: { id_empresa: empresaId },
      include: {
        empresa: { select: { nombre: true } },
        usuario: { select: { nombre: true, email: true } },
        ejecuciones: {
          orderBy: { fecha_inicio: 'desc' },
          take: 5,
          select: {
            id_ejecucion: true,
            estado: true,
            fecha_inicio: true,
            fecha_fin: true,
          },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    await this.reportesValidationService.validateEmpresaExists(empresaId);

    const reporte = await this.prisma.reporte.findFirst({
      where: {
        id_reporte: id,
        id_empresa: empresaId,
      },
      include: {
        empresa: { select: { nombre: true } },
        usuario: { select: { nombre: true, email: true } },
        ejecuciones: {
          orderBy: { fecha_inicio: 'desc' },
          take: 10,
        },
      },
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }

    return reporte;
  }

  async ejecutarReporte(id: number, empresaId: number, usuarioId: number) {
    this.logger.log(`Ejecutando reporte ${id} para empresa ${empresaId}`);

    const reporte = await this.findOne(id, empresaId);

    // Validar permisos específicos
    await this.reportesValidationService.validatePermisoReporte(
      usuarioId,
      empresaId,
      reporte.tipo_reporte,
    );

    // Usar el template method del servicio base
    return this.executeScheduledReporte(id, usuarioId);
  }

  // Métodos específicos para cada tipo de reporte usando servicios especializados

  async getReporteVentas(empresaId: number, params: ReporteParamsDto) {
    this.logger.log(`Generando reporte de ventas para empresa ${empresaId}`);

    const query: IReporteQuery = {
      empresaId,
      fechaInicio: params.fecha_inicio
        ? new Date(params.fecha_inicio)
        : undefined,
      fechaFin: params.fecha_fin ? new Date(params.fecha_fin) : undefined,
      tipoReporte: TipoReporte.VENTAS,
      parametros: params,
    };

    // Usar template method del servicio base
    return this.generateReporte(query, 0, TipoReporte.VENTAS); // usuarioId temporal
  }

  async getReporteProductos(empresaId: number, params: ReporteParamsDto) {
    this.logger.log(`Generando reporte de productos para empresa ${empresaId}`);

    const query: IReporteQuery = {
      empresaId,
      tipoReporte: TipoReporte.PRODUCTOS,
      parametros: params,
    };

    return this.generateReporte(query, 0, TipoReporte.PRODUCTOS);
  }

  async getReporteClientes(empresaId: number, params: ReporteParamsDto) {
    this.logger.log(`Generando reporte de clientes para empresa ${empresaId}`);

    const query: IReporteQuery = {
      empresaId,
      fechaInicio: params.fecha_inicio
        ? new Date(params.fecha_inicio)
        : undefined,
      fechaFin: params.fecha_fin ? new Date(params.fecha_fin) : undefined,
      tipoReporte: TipoReporte.CLIENTES,
      parametros: params,
    };

    return this.generateReporte(query, 0, TipoReporte.CLIENTES);
  }

  async getReporteFinanciero(empresaId: number, params: ReporteParamsDto) {
    this.logger.log(`Generando reporte financiero para empresa ${empresaId}`);

    const query: IReporteQuery = {
      empresaId,
      fechaInicio: params.fecha_inicio
        ? new Date(params.fecha_inicio)
        : undefined,
      fechaFin: params.fecha_fin ? new Date(params.fecha_fin) : undefined,
      tipoReporte: TipoReporte.FINANCIERO,
      parametros: params,
    };

    return this.generateReporte(query, 0, TipoReporte.FINANCIERO);
  }

  async getReporteCompras(empresaId: number, params: ReporteParamsDto) {
    this.logger.log(`Generando reporte de compras para empresa ${empresaId}`);

    const query: IReporteQuery = {
      empresaId,
      fechaInicio: params.fecha_inicio
        ? new Date(params.fecha_inicio)
        : undefined,
      fechaFin: params.fecha_fin ? new Date(params.fecha_fin) : undefined,
      tipoReporte: TipoReporte.COMPRAS,
      parametros: params,
    };

    return this.generateReporte(query, 0, TipoReporte.COMPRAS);
  }

  async getReporteInventario(empresaId: number, params: ReporteParamsDto) {
    this.logger.log(
      `Generando reporte de inventario para empresa ${empresaId}`,
    );

    const query: IReporteQuery = {
      empresaId,
      tipoReporte: TipoReporte.INVENTARIO,
      parametros: params,
    };

    return this.generateReporte(query, 0, TipoReporte.INVENTARIO);
  }

  // Implementación de métodos abstractos de BaseReportesService

  protected async executeReporteQuery(query: IReporteQuery): Promise<any[]> {
    switch (query.tipoReporte) {
      case TipoReporte.VENTAS:
        return this.executeVentasQuery(query);
      case TipoReporte.COMPRAS:
        return this.executeComprasQuery(query);
      case TipoReporte.INVENTARIO:
        return this.executeInventarioQuery(query);
      case TipoReporte.CLIENTES:
        return this.executeClientesQuery(query);
      case TipoReporte.PRODUCTOS:
        return this.executeProductosQuery(query);
      case TipoReporte.FINANCIERO:
        return this.executeFinancieroQuery(query);
      default:
        throw new Error(`Tipo de reporte no soportado: ${query.tipoReporte}`);
    }
  }

  protected async calculateReporteMetrics(query: IReporteQuery): Promise<any> {
    switch (query.tipoReporte) {
      case TipoReporte.VENTAS:
        return this.reportesCalculationService.calculateMetricasVentas(
          query.empresaId,
          query.fechaInicio,
          query.fechaFin,
          query.parametros,
        );
      case TipoReporte.COMPRAS:
        return this.reportesCalculationService.calculateMetricasCompras(
          query.empresaId,
          query.fechaInicio,
          query.fechaFin,
          query.parametros,
        );
      case TipoReporte.INVENTARIO:
        return this.reportesCalculationService.calculateMetricasInventario(
          query.empresaId,
          query.parametros,
        );
      case TipoReporte.CLIENTES:
        return this.reportesCalculationService.calculateMetricasClientes(
          query.empresaId,
          query.fechaInicio,
          query.fechaFin,
          query.parametros,
        );
      case TipoReporte.PRODUCTOS:
        return this.reportesCalculationService.calculateMetricasProductos(
          query.empresaId,
          query.parametros,
        );
      case TipoReporte.FINANCIERO:
        return this.reportesCalculationService.calculateMetricasFinancieras(
          query.empresaId,
          query.fechaInicio,
          query.fechaFin,
          query.parametros,
        );
      default:
        return {};
    }
  }

  protected async countReporteRecords(query: IReporteQuery): Promise<number> {
    const whereClause = this.buildWhereClause(query);

    switch (query.tipoReporte) {
      case TipoReporte.VENTAS:
        return this.prisma.ordenVenta.count({ where: whereClause });
      case TipoReporte.COMPRAS:
        return this.prisma.ordenCompra.count({ where: whereClause });
      case TipoReporte.INVENTARIO:
        return this.prisma.productoServicio.count({
          where: { id_empresa: query.empresaId, es_servicio: false },
        });
      case TipoReporte.CLIENTES:
        return this.prisma.clienteEmpresa.count({
          where: { empresa_id: query.empresaId },
        });
      case TipoReporte.PRODUCTOS:
        return this.prisma.productoServicio.count({
          where: { id_empresa: query.empresaId },
        });
      case TipoReporte.FINANCIERO:
        // Para financiero, contar tanto ventas como compras
        const [ventas, compras] = await Promise.all([
          this.prisma.ordenVenta.count({ where: whereClause }),
          this.prisma.ordenCompra.count({ where: whereClause }),
        ]);
        return ventas + compras;
      default:
        return 0;
    }
  }

  // Métodos específicos para ejecutar consultas por tipo de reporte

  private async executeVentasQuery(query: IReporteQuery): Promise<any[]> {
    const whereClause = this.buildWhereClause(query);
    const pagination = this.buildPaginationClause(query.page, query.limit);

    return this.prisma.ordenVenta.findMany({
      ...pagination,
      where: whereClause,
      include: {
        items: {
          include: {
            producto: {
              select: { nombre: true, categoria: { select: { nombre: true } } },
            },
          },
        },
        cliente: {
          select: { nombre: true, tipo_cliente: true },
        },
        factura: {
          select: { numero_factura: true, estado: true },
        },
      },
      orderBy: { fecha_emision: 'desc' },
    });
  }

  private async executeComprasQuery(query: IReporteQuery): Promise<any[]> {
    const whereClause = this.buildWhereClause(query);
    const pagination = this.buildPaginationClause(query.page, query.limit);

    return this.prisma.ordenCompra.findMany({
      ...pagination,
      where: whereClause,
      include: {
        items: {
          include: {
            producto: {
              select: { nombre: true, categoria: { select: { nombre: true } } },
            },
          },
        },
        proveedor: {
          select: { nombre: true, ruc: true },
        },
        facturas: {
          select: { numero_factura: true, estado: true },
        },
      },
      orderBy: { fecha_emision: 'desc' },
    });
  }

  private async executeInventarioQuery(query: IReporteQuery): Promise<any[]> {
    const pagination = this.buildPaginationClause(query.page, query.limit);
    const umbralMinimo = query.parametros?.umbral_minimo || 10;

    const whereClause: any = {
      id_empresa: query.empresaId,
      es_servicio: false, // Solo productos físicos
    };

    if (query.parametros?.incluir_bajos) {
      whereClause.stock = {
        cantidad: { lte: umbralMinimo },
      };
    }

    return this.prisma.productoServicio.findMany({
      ...pagination,
      where: whereClause,
      include: {
        stock: true,
        categoria: { select: { nombre: true } },
        subcategoria: { select: { nombre: true } },
        historial_precios: {
          orderBy: { fecha_cambio: 'desc' },
          take: 1,
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  private async executeClientesQuery(query: IReporteQuery): Promise<any[]> {
    const pagination = this.buildPaginationClause(query.page, query.limit);

    return this.prisma.clienteEmpresa.findMany({
      ...pagination,
      where: { empresa_id: query.empresaId },
      include: {
        cliente: {
          include: {
            ordenesVenta: query.parametros?.incluir_compras
              ? {
                  where: this.buildDateRangeClause(
                    query.fechaInicio,
                    query.fechaFin,
                  ),
                  select: {
                    id_orden_venta: true,
                    fecha_emision: true,
                    total: true,
                    estado: true,
                  },
                }
              : false,
            valoraciones: query.parametros?.incluir_valoraciones
              ? {
                  select: {
                    puntuacion: true,
                    comentario: true,
                  },
                }
              : false,
          },
        },
      },
      orderBy: { fecha_registro: 'desc' },
    });
  }

  private async executeProductosQuery(query: IReporteQuery): Promise<any[]> {
    const pagination = this.buildPaginationClause(query.page, query.limit);

    const whereClause: any = { id_empresa: query.empresaId };

    if (query.parametros?.categoria_id) {
      whereClause.id_categoria = query.parametros.categoria_id;
    }

    if (query.parametros?.subcategoria_id) {
      whereClause.id_subcategoria = query.parametros.subcategoria_id;
    }

    return this.prisma.productoServicio.findMany({
      ...pagination,
      where: whereClause,
      include: {
        categoria: { select: { nombre: true } },
        subcategoria: { select: { nombre: true } },
        stock: query.parametros?.incluir_stock,
        items_orden_venta: query.parametros?.incluir_ventas
          ? {
              select: {
                cantidad: true,
                precio_unitario: true,
                subtotal: true,
                orden_venta: {
                  select: { fecha_emision: true },
                },
              },
            }
          : false,
        valoraciones: query.parametros?.incluir_valoraciones
          ? {
              select: {
                puntuacion: true,
                comentario: true,
              },
            }
          : false,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  private async executeFinancieroQuery(query: IReporteQuery): Promise<any[]> {
    const whereClause = this.buildWhereClause(query);

    // Para reporte financiero, combinar datos de ventas y compras
    const [ventas, compras] = await Promise.all([
      this.prisma.ordenVenta.findMany({
        where: whereClause,
        select: {
          id_orden_venta: true,
          fecha_emision: true,
          subtotal: true,
          igv: true,
          total: true,
          estado: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fecha_emision: 'desc' },
      }),
      this.prisma.ordenCompra.findMany({
        where: whereClause,
        select: {
          id_orden_compra: true,
          fecha_emision: true,
          subtotal: true,
          igv: true,
          total: true,
          estado: true,
          proveedor: { select: { nombre: true } },
        },
        orderBy: { fecha_emision: 'desc' },
      }),
    ]);

    // Combinar y marcar el tipo de transacción
    const transacciones = [
      ...ventas.map((v) => ({
        ...v,
        tipo: 'venta',
        contraparte: v.cliente?.nombre,
      })),
      ...compras.map((c) => ({
        ...c,
        tipo: 'compra',
        contraparte: c.proveedor?.nombre,
      })),
    ];

    // Ordenar por fecha
    return transacciones.sort(
      (a, b) =>
        new Date(b.fecha_emision).getTime() -
        new Date(a.fecha_emision).getTime(),
    );
  }

  // Método auxiliar para construir cláusulas WHERE

  private buildWhereClause(query: IReporteQuery): any {
    const whereClause: any = { id_empresa: query.empresaId };

    // Agregar filtros de fecha si están presentes
    const dateClause = this.buildDateRangeClause(
      query.fechaInicio,
      query.fechaFin,
    );
    if (Object.keys(dateClause).length > 0) {
      Object.assign(whereClause, dateClause);
    }

    return whereClause;
  }
}
