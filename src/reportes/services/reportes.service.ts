import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReporteDto, TipoReporte } from '../dto/create-reporte.dto';
import {
  IReporte,
  IReporteVentas,
  IReporteCompras,
  IReporteInventario,
  IReporteClientes,
  IReporteProductos,
  IReporteFinanciero,
} from '../interfaces/reporte.interface';
import { ReporteParamsDto } from '../dto/reporte-params.dto';
import {
  BaseReportesService,
  IReporteQuery,
  IReporteResponse,
} from './base-reportes.service';
import { ReportesValidationService } from './reportes-validation.service';
import { ReportesCalculationService } from './reportes-calculation.service';

@Injectable()
export class ReportesService extends BaseReportesService {
  protected readonly logger = new Logger(ReportesService.name);

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
    return this.prisma.reporte.findMany({
      where: {
        id_empresa: empresaId,
      },
      include: {
        empresa: true,
        usuario: true,
        ejecuciones: {
          orderBy: {
            fecha_inicio: 'desc',
          },
          take: 5,
        },
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const reporte = await this.prisma.reporte.findFirst({
      where: {
        id_reporte: id,
        id_empresa: empresaId,
      },
      include: {
        empresa: true,
        usuario: true,
        ejecuciones: {
          orderBy: {
            fecha_inicio: 'desc',
          },
        },
      },
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }

    return reporte;
  }

  async ejecutarReporte(id: number, empresaId: number, usuarioId: number) {
    const reporte = await this.findOne(id, empresaId);

    // Crear registro de ejecución
    const ejecucion = await this.prisma.ejecucionReporte.create({
      data: {
        id_reporte: id,
        id_usuario: usuarioId,
        estado: 'en_proceso',
      },
    });

    try {
      // Generar el reporte según su tipo
      let resultado;
      switch (reporte.tipo_reporte) {
        case TipoReporte.VENTAS:
          resultado = await this.getReporteVentas(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        case TipoReporte.PRODUCTOS:
          resultado = await this.getReporteProductos(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        case TipoReporte.CLIENTES:
          resultado = await this.getReporteClientes(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        case TipoReporte.FINANCIERO:
          resultado = await this.getReporteFinanciero(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        default:
          throw new Error(
            `Tipo de reporte no soportado: ${reporte.tipo_reporte}`,
          );
      }

      // Actualizar ejecución como completada
      await this.prisma.ejecucionReporte.update({
        where: { id_ejecucion: ejecucion.id_ejecucion },
        data: {
          estado: 'completado',
          fecha_fin: new Date(),
          resultado: JSON.stringify(resultado),
        },
      });

      // Actualizar última ejecución del reporte
      await this.prisma.reporte.update({
        where: { id_reporte: id },
        data: {
          ultima_ejecucion: new Date(),
        },
      });

      return { mensaje: 'Reporte generado exitosamente', resultado };
    } catch (error) {
      // Actualizar ejecución como error
      await this.prisma.ejecucionReporte.update({
        where: { id_ejecucion: ejecucion.id_ejecucion },
        data: {
          estado: 'error',
          fecha_fin: new Date(),
          error: error.message,
        },
      });

      throw error;
    }
  }

  private async generarReporte(reporte: any) {
    // Aquí implementaremos la lógica específica para cada tipo de reporte
    switch (reporte.tipo_reporte) {
      case TipoReporte.VENTAS:
        return await this.generarReporteVentas(reporte);
      case TipoReporte.COMPRAS:
        return await this.generarReporteCompras(reporte);
      case TipoReporte.INVENTARIO:
        return await this.generarReporteInventario(reporte);
      case TipoReporte.CLIENTES:
        return await this.generarReporteClientes(reporte);
      case TipoReporte.PRODUCTOS:
        return await this.generarReporteProductos(reporte);
      case TipoReporte.FINANCIERO:
        return await this.generarReporteFinanciero(reporte);
      default:
        throw new Error('Tipo de reporte no soportado');
    }
  }

  private async generarReporteVentas(reporte: IReporte) {
    const params = reporte.parametros as IReporteVentas;

    // Obtener datos de ventas
    const ventas = await this.prisma.ordenVenta.findMany({
      where: {
        id_empresa: reporte.id_empresa,
        fecha_emision: {
          gte: new Date(params.fecha_inicio),
          lte: new Date(params.fecha_fin),
        },
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        cliente: true,
      },
    });

    // Procesar datos según agrupación
    let datosProcesados;
    if (params.agrupar_por) {
      datosProcesados = this.agruparDatosVentas(ventas, params.agrupar_por);
    } else {
      datosProcesados = ventas;
    }

    // Generar archivo según formato
    return this.generarArchivoReporte(
      datosProcesados,
      reporte.formato,
      'ventas',
    );
  }

  private async generarReporteCompras(reporte: IReporte) {
    const params = reporte.parametros as IReporteCompras;

    // Obtener datos de compras
    const compras = await this.prisma.ordenCompra.findMany({
      where: {
        id_empresa: reporte.id_empresa,
        fecha_emision: {
          gte: new Date(params.fecha_inicio),
          lte: new Date(params.fecha_fin),
        },
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        proveedor: true,
      },
    });

    // Procesar datos según agrupación
    let datosProcesados;
    if (params.agrupar_por) {
      datosProcesados = this.agruparDatosCompras(compras, params.agrupar_por);
    } else {
      datosProcesados = compras;
    }

    // Generar archivo según formato
    return this.generarArchivoReporte(
      datosProcesados,
      reporte.formato,
      'compras',
    );
  }

  private async generarReporteInventario(reporte: IReporte) {
    const params = reporte.parametros as IReporteInventario;

    // Obtener datos de inventario
    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: reporte.id_empresa,
        es_servicio: false,
      },
      include: {
        stock: true,
        categoria: true,
        subcategoria: true,
        proveedores: {
          include: {
            proveedor: true,
          },
        },
      },
    });

    // Filtrar productos con stock bajo si es necesario
    let datosProcesados = productos;
    const umbralMinimo = params.umbral_minimo ?? 0;
    if (params.incluir_bajos) {
      datosProcesados = productos.filter(
        (p) => p.stock && p.stock.cantidad <= umbralMinimo,
      );
    }

    // Agrupar por categoría, subcategoría o proveedor si es necesario
    if (params.agrupar_por) {
      datosProcesados = this.agruparDatosInventario(
        datosProcesados,
        params.agrupar_por,
      );
    }

    // Generar archivo según formato
    return this.generarArchivoReporte(
      datosProcesados,
      reporte.formato,
      'inventario',
    );
  }

  private async generarReporteClientes(reporte: IReporte) {
    const params = reporte.parametros as IReporteClientes;

    // Obtener datos de clientes
    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresas: {
          some: {
            empresa_id: reporte.id_empresa,
          },
        },
        ...(params.tipo_cliente && { tipo_cliente: params.tipo_cliente }),
      },
      include: {
        historialCompras: params.incluir_compras
          ? {
              include: {
                producto: true,
              },
            }
          : false,
        valoraciones: params.incluir_valoraciones
          ? {
              include: {
                producto: true,
              },
            }
          : false,
      },
    });

    // Generar archivo según formato
    return this.generarArchivoReporte(clientes, reporte.formato, 'clientes');
  }

  private async generarReporteProductos(reporte: IReporte) {
    const params = reporte.parametros as IReporteProductos;

    // Obtener datos de productos
    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: reporte.id_empresa,
        ...(params.categoria_id && { id_categoria: params.categoria_id }),
        ...(params.subcategoria_id && {
          id_subcategoria: params.subcategoria_id,
        }),
      },
      include: {
        stock: params.incluir_stock,
        historialCompras: params.incluir_ventas
          ? {
              include: {
                cliente: true,
              },
            }
          : false,
        valoraciones: params.incluir_valoraciones
          ? {
              include: {
                cliente: true,
              },
            }
          : false,
        categoria: true,
        subcategoria: true,
      },
    });

    // Luego filtramos los productos con stock bajo si es necesario
    let productosFiltrados = productos;
    // Usamos type assertion para evitar errores de TypeScript
    const paramsAny = params as any;
    if (paramsAny.incluir_bajos && paramsAny.umbral_minimo !== undefined) {
      const umbralMinimo = paramsAny.umbral_minimo;
      productosFiltrados = productos.filter(
        (producto) => producto.stock && producto.stock.cantidad <= umbralMinimo,
      );
    }

    // Calculamos el promedio de valoraciones
    const promedioValoracion =
      productos.reduce((acc, producto) => {
        if (producto.valoraciones && producto.valoraciones.length > 0) {
          const sumaValoraciones = producto.valoraciones.reduce(
            (sum, val) => sum + val.puntuacion,
            0,
          );
          return acc + sumaValoraciones / producto.valoraciones.length;
        }
        return acc;
      }, 0) / (productos.length || 1);

    return {
      productos: productosFiltrados,
      resumen: {
        total_productos: productos.length,
        productos_bajos: productosFiltrados.length,
        promedio_valoracion: promedioValoracion,
      },
    };
  }

  private async generarReporteFinanciero(reporte: IReporte) {
    const params = reporte.parametros as IReporteFinanciero;

    // Obtener datos financieros según el tipo
    let datosFinancieros;

    if (params.tipo === 'ventas' || params.tipo === 'general') {
      const ventas = await this.prisma.ordenVenta.findMany({
        where: {
          id_empresa: reporte.id_empresa,
          fecha_emision: {
            gte: new Date(params.fecha_inicio),
            lte: new Date(params.fecha_fin),
          },
        },
        include: {
          items: params.incluir_detalles
            ? {
                include: {
                  producto: true,
                },
              }
            : false,
        },
      });

      datosFinancieros = { ventas };
    }

    if (params.tipo === 'compras' || params.tipo === 'general') {
      const compras = await this.prisma.ordenCompra.findMany({
        where: {
          id_empresa: reporte.id_empresa,
          fecha_emision: {
            gte: new Date(params.fecha_inicio),
            lte: new Date(params.fecha_fin),
          },
        },
        include: {
          items: params.incluir_detalles
            ? {
                include: {
                  producto: true,
                },
              }
            : false,
        },
      });

      datosFinancieros = { ...datosFinancieros, compras };
    }

    // Generar archivo según formato
    return this.generarArchivoReporte(
      datosFinancieros,
      reporte.formato,
      'financiero',
    );
  }

  // Métodos auxiliares para procesar datos
  private agruparDatosVentas(ventas: any[], agruparPor: string) {
    // Implementar lógica de agrupación
    return ventas;
  }

  private agruparDatosCompras(compras: any[], agruparPor: string) {
    // Implementar lógica de agrupación
    return compras;
  }

  private agruparDatosInventario(productos: any[], agruparPor: string) {
    // Implementar lógica de agrupación
    return productos;
  }

  private generarArchivoReporte(datos: any, formato: string, tipo: string) {
    // Aquí implementaríamos la generación real del archivo
    // Por ahora, devolvemos una URL simulada
    return `https://api.businessgo.com/reportes/${tipo}_${Date.now()}.${formato}`;
  }

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

    // Usar servicio de cálculos especializado
    const metricas =
      await this.reportesCalculationService.calculateMetricasVentas(
        empresaId,
        query.fechaInicio,
        query.fechaFin,
        params,
      );

    return {
      tipo: 'ventas',
      empresa_id: empresaId,
      periodo: {
        fecha_inicio: query.fechaInicio,
        fecha_fin: query.fechaFin,
      },
      metricas,
      generado_en: new Date(),
    };
  }

  // Implementación de métodos abstractos de BaseReportesService
  protected async executeReporteQuery(query: IReporteQuery): Promise<any[]> {
    const {
      tipoReporte,
      empresaId,
      fechaInicio,
      fechaFin,
      page,
      limit,
      parametros,
    } = query;

    switch (tipoReporte) {
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

      case TipoReporte.WHATSAPP:
        return this.getWhatsappData(
          empresaId,
          fechaInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          fechaFin || new Date(),
          page || 1,
          limit || 20,
          parametros,
        );

      default:
        throw new Error(`Tipo de reporte no soportado: ${tipoReporte}`);
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
      case TipoReporte.WHATSAPP:
        return this.reportesCalculationService.calculateMetricasWhatsapp(
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
    const whereClause = this.buildVentasWhereClause(query);

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
      case TipoReporte.WHATSAPP:
        // Contar notificaciones y auditorías de WhatsApp
        const [notificaciones, auditorias] = await Promise.all([
          this.prisma.notificacion.count({
            where: {
              id_empresa: query.empresaId,
              tipo_notificacion: 'WHATSAPP',
            },
          }),
          this.prisma.auditoria.count({
            where: {
              empresa_id: query.empresaId,
              recurso: 'whatsapp',
            },
          }),
        ]);
        return notificaciones + auditorias;
      default:
        return 0;
    }
  }

  // Métodos específicos para cada tipo de reporte

  private async executeVentasQuery(query: IReporteQuery): Promise<any[]> {
    const where = {
      id_empresa: query.empresaId,
      ...(query.fechaInicio && query.fechaFin
        ? {
            fecha_emision: {
              gte: query.fechaInicio,
              lte: query.fechaFin,
            },
          }
        : {}),
    };

    const ventas = await this.prisma.ordenVenta.findMany({
      where,
      include: {
        cliente: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    const totalVentas = ventas.reduce(
      (acc, venta) => acc + Number(venta.total),
      0,
    );
    const totalProductos = ventas.reduce(
      (acc, venta) =>
        acc + venta.items.reduce((sum, det) => sum + det.cantidad, 0),
      0,
    );

    return [
      ...ventas.map((venta) => ({
        ...venta,
        tipo: 'venta',
        resumen: {
          total_ventas: totalVentas,
          total_productos: totalProductos,
          cantidad_ventas: ventas.length,
        },
      })),
    ];
  }

  private async executeComprasQuery(query: IReporteQuery): Promise<any[]> {
    const where = {
      id_empresa: query.empresaId,
      ...(query.fechaInicio && query.fechaFin
        ? {
            fecha_emision: {
              gte: query.fechaInicio,
              lte: query.fechaFin,
            },
          }
        : {}),
    };

    return this.prisma.ordenCompra.findMany({
      where,
      include: {
        proveedor: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });
  }

  private async executeInventarioQuery(query: IReporteQuery): Promise<any[]> {
    return this.prisma.productoServicio.findMany({
      where: {
        id_empresa: query.empresaId,
        es_servicio: false,
      },
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
      },
    });
  }

  private async executeClientesQuery(query: IReporteQuery): Promise<any[]> {
    return this.prisma.cliente.findMany({
      where: {
        empresas: {
          some: {
            empresa_id: query.empresaId,
          },
        },
      },
      include: {
        ordenesVenta: {
          where:
            query.fechaInicio && query.fechaFin
              ? {
                  fecha_emision: {
                    gte: query.fechaInicio,
                    lte: query.fechaFin,
                  },
                }
              : undefined,
        },
        valoraciones: true,
      },
    });
  }

  private async executeProductosQuery(query: IReporteQuery): Promise<any[]> {
    return this.prisma.productoServicio.findMany({
      where: {
        id_empresa: query.empresaId,
      },
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
        valoraciones: true,
      },
    });
  }

  private async executeFinancieroQuery(query: IReporteQuery): Promise<any[]> {
    const where = {
      id_empresa: query.empresaId,
      ...(query.fechaInicio && query.fechaFin
        ? {
            fecha_emision: {
              gte: query.fechaInicio,
              lte: query.fechaFin,
            },
          }
        : {}),
    };

    const [ventas, compras] = await Promise.all([
      this.prisma.ordenVenta.findMany({
        where,
        include: { items: true },
      }),
      this.prisma.ordenCompra.findMany({
        where,
        include: { items: true },
      }),
    ]);

    // Combinar y marcar el tipo de transacción
    const transacciones = [
      ...ventas.map((v) => ({
        ...v,
        tipo: 'venta',
      })),
      ...compras.map((c) => ({
        ...c,
        tipo: 'compra',
      })),
    ];

    return transacciones;
  }

  private buildVentasWhereClause(query: IReporteQuery): any {
    return {
      id_empresa: query.empresaId,
      ...(query.fechaInicio && query.fechaFin
        ? {
            fecha_emision: {
              gte: query.fechaInicio,
              lte: query.fechaFin,
            },
          }
        : {}),
    };
  }

  async getReporteProductos(empresaId: number, params: ReporteParamsDto) {
    // Primero obtenemos todos los productos de la empresa
    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
      },
      include: {
        categoria: true,
        subcategoria: true,
        stock: true,
        disponibilidad: true,
        valoraciones: true,
      },
    });

    // Luego filtramos los productos con stock bajo si es necesario
    let productosFiltrados = productos;
    // Usamos type assertion para evitar errores de TypeScript
    const paramsAny = params as any;
    if (paramsAny.incluir_bajos && paramsAny.umbral_minimo !== undefined) {
      const umbralMinimo = paramsAny.umbral_minimo;
      productosFiltrados = productos.filter(
        (producto) => producto.stock && producto.stock.cantidad <= umbralMinimo,
      );
    }

    // Calculamos el promedio de valoraciones
    const promedioValoracion =
      productos.reduce((acc, producto) => {
        if (producto.valoraciones && producto.valoraciones.length > 0) {
          const sumaValoraciones = producto.valoraciones.reduce(
            (sum, val) => sum + val.puntuacion,
            0,
          );
          return acc + sumaValoraciones / producto.valoraciones.length;
        }
        return acc;
      }, 0) / (productos.length || 1);

    return {
      productos: productosFiltrados,
      resumen: {
        total_productos: productos.length,
        productos_bajos: productosFiltrados.length,
        promedio_valoracion: promedioValoracion,
      },
    };
  }

  async getReporteClientes(empresaId: number, params: ReporteParamsDto) {
    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresas: {
          some: {
            empresa_id: empresaId,
          },
        },
        ...(params.fecha_inicio && params.fecha_fin
          ? {
              ordenesVenta: {
                some: {
                  fecha_emision: {
                    gte: new Date(params.fecha_inicio),
                    lte: new Date(params.fecha_fin),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        ordenesVenta: {
          include: {
            items: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
    });

    const clientesConCompras = clientes.map((cliente) => ({
      ...cliente,
      total_compras: cliente.ordenesVenta.reduce(
        (acc, venta) => acc + Number(venta.total),
        0,
      ),
      cantidad_compras: cliente.ordenesVenta.length,
      productos_comprados: cliente.ordenesVenta.reduce(
        (acc, venta) =>
          acc + venta.items.reduce((sum, det) => sum + det.cantidad, 0),
        0,
      ),
    }));

    return {
      clientes: clientesConCompras,
      resumen: {
        total_clientes: clientes.length,
        clientes_activos: clientes.filter((c) => c.ordenesVenta.length > 0)
          .length,
        promedio_compras:
          clientesConCompras.reduce((acc, c) => acc + c.total_compras, 0) /
            clientes.length || 0,
      },
    };
  }

  async getReporteFinanciero(empresaId: number, params: ReporteParamsDto) {
    const where = {
      id_empresa: empresaId,
      ...(params.fecha_inicio && params.fecha_fin
        ? {
            fecha_emision: {
              gte: new Date(params.fecha_inicio),
              lte: new Date(params.fecha_fin),
            },
          }
        : {}),
    };

    const [ventas, compras] = await Promise.all([
      this.prisma.ordenVenta.findMany({
        where,
        include: {
          items: true,
        },
      }),
      this.prisma.ordenCompra.findMany({
        where,
        include: {
          items: true,
        },
      }),
    ]);

    const ingresos = ventas.reduce(
      (acc, venta) => acc + Number(venta.total),
      0,
    );
    const gastos = compras.reduce(
      (acc, compra) =>
        acc +
        compra.items.reduce((sum, item) => sum + Number(item.subtotal), 0),
      0,
    );

    return {
      ventas,
      compras,
      resumen: {
        ingresos,
        gastos,
        balance: ingresos - gastos,
        cantidad_ventas: ventas.length,
        cantidad_compras: compras.length,
      },
    };
  }

  /**
   * Genera reporte específico de WhatsApp con métricas detalladas
   */
  async getReporteWhatsapp(
    empresaId: number,
    parametros: {
      fechaInicio?: Date;
      fechaFin?: Date;
      page?: number;
      limit?: number;
      incluirAlertas?: boolean;
      agruparPor?: 'hora' | 'dia' | 'semana' | 'mes';
      instanciaId?: string;
      formatoSalida?: 'JSON' | 'CSV' | 'PDF';
    } = {},
  ): Promise<IReporteResponse<any>> {
    this.logger.log(`Generando reporte de WhatsApp para empresa ${empresaId}`);

    try {
      const query: IReporteQuery = {
        tipoReporte: TipoReporte.WHATSAPP,
        empresaId,
        fechaInicio:
          parametros.fechaInicio ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        fechaFin: parametros.fechaFin || new Date(),
        page: parametros.page || 1,
        limit: parametros.limit || 100,
        parametros: {
          incluirAlertas: parametros.incluirAlertas ?? true,
          agrupar_por: parametros.agruparPor || 'dia',
          instanciaId: parametros.instanciaId,
          formatoSalida: parametros.formatoSalida || 'JSON',
        },
      };

      // Validar parámetros específicos de WhatsApp
      this.validateWhatsappParameters(query.parametros);

      // Ejecutar consulta de datos
      const data = await this.executeReporteQuery(query);

      // Calcular métricas específicas de WhatsApp
      const metricas = await this.calculateReporteMetrics(query);

      // Obtener conteo total
      const total = await this.countReporteRecords(query);

      // Construir metadata de paginación
      const metadata = {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
        hasNext: (query.page || 1) < Math.ceil(total / (query.limit || 20)),
        hasPrev: (query.page || 1) > 1,
      };

      // Configuración regional peruana
      const configuracion = {
        moneda: 'PEN',
        zona_horaria: 'America/Lima',
        formato_fecha: 'dd/MM/yyyy',
        igv_rate: 0.18,
        decimales_moneda: 2,
        incluir_igv: true,
        idioma: 'es',
      };

      this.logger.log(
        `Reporte de WhatsApp generado: ${data.length} registros, ${metricas.totalMensajes} mensajes totales`,
      );

      return {
        data,
        metadata,
        metricas,
        configuracion,
      };
    } catch (error) {
      this.logger.error(
        `Error generando reporte de WhatsApp: ${error.message}`,
        error.stack,
      );
      throw new Error(`Error al generar reporte de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Valida parámetros específicos para reportes de WhatsApp
   */
  private validateWhatsappParameters(parametros: any): void {
    if (
      parametros.agrupar_por &&
      !['hora', 'dia', 'semana', 'mes'].includes(parametros.agrupar_por)
    ) {
      throw new Error(
        'El parámetro agrupar_por debe ser: hora, dia, semana o mes',
      );
    }

    if (
      parametros.formatoSalida &&
      !['JSON', 'CSV', 'PDF'].includes(parametros.formatoSalida)
    ) {
      throw new Error('El formato de salida debe ser: JSON, CSV o PDF');
    }

    if (parametros.instanciaId && typeof parametros.instanciaId !== 'string') {
      throw new Error('El ID de instancia debe ser una cadena válida');
    }
  }

  /**
   * Obtiene datos específicos de WhatsApp para el reporte
   */
  private async getWhatsappData(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
    page: number,
    limit: number,
    parametros: any,
  ): Promise<any[]> {
    const offset = (page - 1) * limit;

    // Base where clause para filtros comunes
    const whereClause: any = {
      id_empresa: empresaId,
      fecha_notificacion: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    // Filtro por instancia específica si se proporciona
    if (parametros.instanciaId) {
      whereClause.datos_adicionales = {
        path: ['id_instancia'],
        equals: parametros.instanciaId,
      };
    }

    try {
      // Obtener notificaciones de WhatsApp
      const notificaciones = await this.prisma.notificacion.findMany({
        where: {
          ...whereClause,
          tipo_notificacion: 'WHATSAPP',
        },
        // include: {
        //   usuario: {
        //     select: {
        //       nombre: true,
        //       email: true,
        //     },
        //   },
        // },
        orderBy: {
          fecha_notificacion: 'desc',
        },
        take: Math.floor(limit * 0.6), // 60% notificaciones
        skip: Math.floor(offset * 0.6),
      });

      // Obtener auditorías de WhatsApp
      const auditorias = await this.prisma.auditoria.findMany({
        where: {
          empresa_id: empresaId,
          recurso: 'whatsapp',
          fecha_evento: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        // include: {
        //   usuario: {
        //     select: {
        //       nombre: true,
        //       email: true,
        //     },
        //   },
        // },
        orderBy: {
          fecha_evento: 'desc',
        },
        take: Math.floor(limit * 0.4), // 40% auditorías
        skip: Math.floor(offset * 0.4),
      });

      // Obtener instancias relacionadas para contexto
      const instancias = await this.prisma.evolutionInstance.findMany({
        where: {
          id_empresa: empresaId,
        },
        // include: {
        //   configuracion: true,
        // },
      });

      // Crear mapa de instancias para lookup rápido
      const instanciasMap = new Map(
        instancias.map((inst) => [inst.id_instance, inst]),
      );

      // Combinar y formatear datos
      const datosCombiandos = [
        ...notificaciones.map((n) => ({
          tipo: 'NOTIFICACION',
          id: n.id_notificacion,
          fecha: n.fecha_notificacion,
          contenido: n.contenido || n.titulo,
          estado: n.fecha_leida ? 'LEIDA' : 'PENDIENTE',
          usuario: 'Sistema', // n.usuario?.nombre || 'Sistema',
          instancia:
            this.extractFromJson(n.datos_adicionales, 'id_instancia') ||
            'Desconocida',
          instancia_info: instanciasMap.get(
            this.extractFromJson(n.datos_adicionales, 'id_instancia'),
          ),
          datos_adicionales: n.datos_adicionales,
          prioridad: this.determinarPrioridad(n),
          // Formateo específico peruano
          fecha_formateada: this.formatearFecha(n.fecha_notificacion),
          tiempo_lectura: n.fecha_leida
            ? Math.round(
                (new Date(n.fecha_leida).getTime() -
                  new Date(n.fecha_notificacion).getTime()) /
                  (1000 * 60),
              )
            : null,
        })),
        ...auditorias.map((a) => ({
          tipo: 'AUDITORIA',
          id: a.id,
          fecha: a.fecha_evento,
          contenido: a.descripcion,
          accion: a.accion,
          resultado: 'EXITOSO', // a.resultado || 'EXITOSO',
          usuario: 'Sistema', // a.usuario?.nombre || this.extractFromJson(a.metadatos, 'usuario') || 'Sistema',
          instancia:
            this.extractFromJson(a.metadatos, 'id_instancia') ||
            this.extractFromJson(a.metadatos, 'instancia') ||
            'Desconocida',
          instancia_info: instanciasMap.get(
            this.extractFromJson(a.metadatos, 'id_instancia'),
          ),
          datos_adicionales: a.metadatos,
          // Formateo específico peruano
          fecha_formateada: this.formatearFecha(a.fecha_evento),
        })),
      ];

      // Ordenar por fecha descendente
      datosCombiandos.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      );

      // Aplicar límite final
      return datosCombiandos.slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Error obteniendo datos de WhatsApp: ${error.message}`,
        error.stack,
      );
      throw new Error(`Error al obtener datos de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Determina la prioridad de una notificación basada en su contenido
   */
  private determinarPrioridad(notificacion: any): 'ALTA' | 'MEDIA' | 'BAJA' {
    const contenido = (
      notificacion.contenido ||
      notificacion.titulo ||
      ''
    ).toLowerCase();

    if (
      contenido.includes('error') ||
      contenido.includes('desconectado') ||
      contenido.includes('fallo')
    ) {
      return 'ALTA';
    }

    if (
      contenido.includes('mensaje entrante') ||
      contenido.includes('nuevo mensaje')
    ) {
      return 'MEDIA';
    }

    return 'BAJA';
  }

  /**
   * Formatea fecha según el contexto peruano
   */
  private formatearFecha(fecha: Date | string): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;

    return fechaObj.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    });
  }

  /**
   * Extrae un valor de un objeto JSON de forma segura
   */
  private extractFromJson(jsonValue: any, key: string): any {
    if (!jsonValue || typeof jsonValue !== 'object') {
      return null;
    }
    return jsonValue[key];
  }
}
