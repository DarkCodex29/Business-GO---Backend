import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReporteDto: CreateReporteDto, usuarioId: number) {
    const { id_empresa, ...reporteData } = createReporteDto;

    return this.prisma.reporte.create({
      data: {
        ...reporteData,
        id_usuario: usuarioId,
        id_empresa,
      },
      include: {
        empresa: true,
        usuario: true,
      },
    });
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
        case 'ventas':
          resultado = await this.getReporteVentas(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        case 'productos':
          resultado = await this.getReporteProductos(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        case 'clientes':
          resultado = await this.getReporteClientes(
            empresaId,
            reporte.parametros as ReporteParamsDto,
          );
          break;
        case 'financiero':
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

    return {
      ventas,
      resumen: {
        total_ventas: totalVentas,
        total_productos: totalProductos,
        cantidad_ventas: ventas.length,
      },
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
}
