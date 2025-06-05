import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface IMetricasVentas {
  totalVentas: Decimal;
  totalVentasSinIGV: Decimal;
  igvTotal: Decimal;
  cantidadOrdenes: number;
  ticketPromedio: Decimal;
  crecimientoVentas: Decimal;
  ventasPorPeriodo: any[];
  topProductos: any[];
  topClientes: any[];
}

export interface IMetricasCompras {
  totalCompras: Decimal;
  totalComprasSinIGV: Decimal;
  igvTotal: Decimal;
  cantidadOrdenes: number;
  costoPromedio: Decimal;
  crecimientoCompras: Decimal;
  comprasPorPeriodo: any[];
  topProveedores: any[];
  topProductos: any[];
}

export interface IMetricasInventario {
  valorTotalInventario: Decimal;
  cantidadProductos: number;
  productosStockBajo: number;
  rotacionPromedio: Decimal;
  productosTopRotacion: any[];
  productosStockCritico: any[];
  valorPorCategoria: any[];
}

export interface IMetricasClientes {
  totalClientes: number;
  clientesActivos: number;
  clientesNuevos: number;
  valorPromedioCliente: Decimal;
  frecuenciaCompraPromedio: Decimal;
  topClientesPorValor: any[];
  clientesPorTipo: any[];
  retencionClientes: Decimal;
}

export interface IMetricasProductos {
  totalProductos: number;
  productosActivos: number;
  ventasTotales: Decimal;
  margenPromedio: Decimal;
  topProductosVentas: any[];
  topProductosMargen: any[];
  productosPorCategoria: any[];
  rendimientoProductos: any[];
}

export interface IMetricasFinancieras {
  ingresosTotales: Decimal;
  costosTotales: Decimal;
  utilidadBruta: Decimal;
  margenBruto: Decimal;
  igvRecaudado: Decimal;
  igvPagado: Decimal;
  flujoEfectivo: Decimal;
  rentabilidad: Decimal;
  indicadoresFinancieros: any;
}

export interface IMetricasWhatsapp {
  totalMensajes: number;
  mensajesEnviados: number;
  mensajesRecibidos: number;
  totalConversaciones: number;
  conversacionesActivas: number;
  totalInstancias: number;
  instanciasConectadas: number;
  tiempoRespuestaPromedio: number;
  tasaRespuesta: number;
  notificacionesWhatsapp: number;
  mensajesPorPeriodo: any[];
  topConversaciones: any[];
  topInstancias: any[];
  alertasWhatsapp: any[];
}

export interface IReportesCalculator {
  calculateMetricasVentas(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasVentas>;
  calculateMetricasCompras(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasCompras>;
  calculateMetricasInventario(
    empresaId: number,
    parametros?: any,
  ): Promise<IMetricasInventario>;
  calculateMetricasClientes(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasClientes>;
  calculateMetricasProductos(
    empresaId: number,
    parametros?: any,
  ): Promise<IMetricasProductos>;
  calculateMetricasFinancieras(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasFinancieras>;
  calculateMetricasWhatsapp(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasWhatsapp>;
}

@Injectable()
export class ReportesCalculationService implements IReportesCalculator {
  private readonly logger = new Logger(ReportesCalculationService.name);

  // Configuración específica para contexto peruano
  private readonly CONFIG_PERU = {
    IGV_RATE: new Decimal(0.18), // 18% IGV en Perú
    MONEDA: 'PEN', // Soles peruanos
    ZONA_HORARIA: 'America/Lima',
    FORMATO_FECHA: 'dd/MM/yyyy',
    DECIMALES_MONEDA: 2,
    UMBRAL_STOCK_CRITICO: 10,
    DIAS_PERIODO_ROTACION: 30,
  };

  constructor(private readonly prisma: PrismaService) {}

  async calculateMetricasVentas(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasVentas> {
    this.logger.log(`Calculando métricas de ventas para empresa ${empresaId}`);

    const whereClause = this.buildVentasWhereClause(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Obtener datos base de ventas
    const ventas = await this.prisma.ordenVenta.findMany({
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
      },
    });

    // Calcular métricas principales
    const totalVentas = ventas.reduce(
      (sum, venta) => sum.add(venta.total),
      new Decimal(0),
    );

    const totalVentasSinIGV = ventas.reduce(
      (sum, venta) => sum.add(venta.subtotal),
      new Decimal(0),
    );

    const igvTotal = totalVentas.sub(totalVentasSinIGV);
    const cantidadOrdenes = ventas.length;
    const ticketPromedio =
      cantidadOrdenes > 0 ? totalVentas.div(cantidadOrdenes) : new Decimal(0);

    // Calcular crecimiento vs período anterior
    const crecimientoVentas = await this.calculateCrecimientoVentas(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Agrupar ventas por período
    const ventasPorPeriodo = this.agruparVentasPorPeriodo(
      ventas,
      parametros?.agrupar_por || 'mes',
    );

    // Top productos más vendidos
    const topProductos = this.calculateTopProductosVentas(ventas);

    // Top clientes por valor
    const topClientes = this.calculateTopClientesVentas(ventas);

    this.logger.log(
      `Métricas de ventas calculadas: Total S/ ${totalVentas.toFixed(2)}, Órdenes: ${cantidadOrdenes}`,
    );

    return {
      totalVentas,
      totalVentasSinIGV,
      igvTotal,
      cantidadOrdenes,
      ticketPromedio,
      crecimientoVentas,
      ventasPorPeriodo,
      topProductos,
      topClientes,
    };
  }

  async calculateMetricasCompras(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasCompras> {
    this.logger.log(`Calculando métricas de compras para empresa ${empresaId}`);

    const whereClause = this.buildComprasWhereClause(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    const compras = await this.prisma.ordenCompra.findMany({
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
      },
    });

    const totalCompras = compras.reduce(
      (sum, compra) => sum.add(compra.total),
      new Decimal(0),
    );

    const totalComprasSinIGV = compras.reduce(
      (sum, compra) => sum.add(compra.subtotal),
      new Decimal(0),
    );

    const igvTotal = totalCompras.sub(totalComprasSinIGV);
    const cantidadOrdenes = compras.length;
    const costoPromedio =
      cantidadOrdenes > 0 ? totalCompras.div(cantidadOrdenes) : new Decimal(0);

    const crecimientoCompras = await this.calculateCrecimientoCompras(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    const comprasPorPeriodo = this.agruparComprasPorPeriodo(
      compras,
      parametros?.agrupar_por || 'mes',
    );

    const topProveedores = this.calculateTopProveedoresCompras(compras);
    const topProductos = this.calculateTopProductosCompras(compras);

    this.logger.log(
      `Métricas de compras calculadas: Total S/ ${totalCompras.toFixed(2)}, Órdenes: ${cantidadOrdenes}`,
    );

    return {
      totalCompras,
      totalComprasSinIGV,
      igvTotal,
      cantidadOrdenes,
      costoPromedio,
      crecimientoCompras,
      comprasPorPeriodo,
      topProveedores,
      topProductos,
    };
  }

  async calculateMetricasInventario(
    empresaId: number,
    parametros?: any,
  ): Promise<IMetricasInventario> {
    this.logger.log(
      `Calculando métricas de inventario para empresa ${empresaId}`,
    );

    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
        es_servicio: false, // Solo productos físicos
      },
      include: {
        stock: true,
        categoria: { select: { nombre: true } },
        historial_precios: {
          orderBy: { fecha_cambio: 'desc' },
          take: 1,
        },
      },
    });

    const valorTotalInventario = productos.reduce((sum, producto) => {
      const stock = producto.stock?.cantidad || 0;
      const precio = producto.precio;
      return sum.add(precio.mul(stock));
    }, new Decimal(0));

    const cantidadProductos = productos.length;
    const umbralMinimo =
      parametros?.umbral_minimo || this.CONFIG_PERU.UMBRAL_STOCK_CRITICO;

    const productosStockBajo = productos.filter(
      (producto) => (producto.stock?.cantidad || 0) <= umbralMinimo,
    ).length;

    // Calcular rotación promedio (simplificado)
    const rotacionPromedio = await this.calculateRotacionPromedio(empresaId);

    const productosTopRotacion =
      await this.calculateTopProductosRotacion(empresaId);
    const productosStockCritico = productos
      .filter((producto) => (producto.stock?.cantidad || 0) <= umbralMinimo)
      .map((producto) => ({
        id: producto.id_producto,
        nombre: producto.nombre,
        stock_actual: producto.stock?.cantidad || 0,
        precio: producto.precio,
        categoria: producto.categoria?.nombre,
        valor_stock: producto.precio.mul(producto.stock?.cantidad || 0),
      }));

    const valorPorCategoria = this.calculateValorPorCategoria(productos);

    this.logger.log(
      `Métricas de inventario calculadas: Valor total S/ ${valorTotalInventario.toFixed(2)}, Productos: ${cantidadProductos}`,
    );

    return {
      valorTotalInventario,
      cantidadProductos,
      productosStockBajo,
      rotacionPromedio,
      productosTopRotacion,
      productosStockCritico,
      valorPorCategoria,
    };
  }

  async calculateMetricasClientes(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasClientes> {
    this.logger.log(
      `Calculando métricas de clientes para empresa ${empresaId}`,
    );

    const clientes = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      include: {
        cliente: {
          include: {
            ordenesVenta: {
              where: this.buildVentasWhereClause(
                empresaId,
                fechaInicio,
                fechaFin,
              ),
            },
          },
        },
      },
    });

    const totalClientes = clientes.length;
    const clientesActivos = clientes.filter(
      (ce) => ce.cliente.ordenesVenta.length > 0,
    ).length;

    // Clientes nuevos en el período
    const clientesNuevos = fechaInicio
      ? clientes.filter((ce) => ce.fecha_registro >= fechaInicio).length
      : 0;

    // Valor promedio por cliente
    const ventasTotales = clientes.reduce((sum, ce) => {
      const ventasCliente = ce.cliente.ordenesVenta.reduce(
        (clienteSum, orden) => clienteSum.add(orden.total),
        new Decimal(0),
      );
      return sum.add(ventasCliente);
    }, new Decimal(0));

    const valorPromedioCliente =
      clientesActivos > 0 ? ventasTotales.div(clientesActivos) : new Decimal(0);

    // Frecuencia de compra promedio
    const frecuenciaCompraPromedio =
      clientesActivos > 0
        ? new Decimal(
            clientes.reduce(
              (sum, ce) => sum + ce.cliente.ordenesVenta.length,
              0,
            ) / clientesActivos,
          )
        : new Decimal(0);

    const topClientesPorValor = this.calculateTopClientesPorValor(clientes);
    const clientesPorTipo = this.calculateClientesPorTipo(clientes);
    const retencionClientes = this.calculateRetencionClientes(
      clientes,
      fechaInicio,
      fechaFin,
    );

    this.logger.log(
      `Métricas de clientes calculadas: Total ${totalClientes}, Activos ${clientesActivos}`,
    );

    return {
      totalClientes,
      clientesActivos,
      clientesNuevos,
      valorPromedioCliente,
      frecuenciaCompraPromedio,
      topClientesPorValor,
      clientesPorTipo,
      retencionClientes,
    };
  }

  async calculateMetricasProductos(
    empresaId: number,
    parametros?: any,
  ): Promise<IMetricasProductos> {
    this.logger.log(
      `Calculando métricas de productos para empresa ${empresaId}`,
    );

    const whereClause: any = { id_empresa: empresaId };
    if (parametros?.categoria_id) {
      whereClause.id_categoria = parametros.categoria_id;
    }
    if (parametros?.subcategoria_id) {
      whereClause.id_subcategoria = parametros.subcategoria_id;
    }

    const productos = await this.prisma.productoServicio.findMany({
      where: whereClause,
      include: {
        categoria: { select: { nombre: true } },
        subcategoria: { select: { nombre: true } },
        items_orden_venta: {
          include: {
            orden_venta: {
              select: { total: true, fecha_emision: true },
            },
          },
        },
        stock: true,
      },
    });

    const totalProductos = productos.length;
    const productosActivos = productos.filter(
      (producto) => (producto.stock?.cantidad || 0) > 0 || producto.es_servicio,
    ).length;

    const ventasTotales = productos.reduce((sum, producto) => {
      const ventasProducto = producto.items_orden_venta.reduce(
        (prodSum, item) => prodSum.add(item.subtotal),
        new Decimal(0),
      );
      return sum.add(ventasProducto);
    }, new Decimal(0));

    // Calcular margen promedio (simplificado)
    const margenPromedio =
      await this.calculateMargenPromedioProductos(productos);

    const topProductosVentas = this.calculateTopProductosVentas(productos);
    const topProductosMargen = this.calculateTopProductosMargen(productos);
    const productosPorCategoria =
      this.calculateProductosPorCategoria(productos);
    const rendimientoProductos = this.calculateRendimientoProductos(productos);

    this.logger.log(
      `Métricas de productos calculadas: Total ${totalProductos}, Ventas S/ ${ventasTotales.toFixed(2)}`,
    );

    return {
      totalProductos,
      productosActivos,
      ventasTotales,
      margenPromedio,
      topProductosVentas,
      topProductosMargen,
      productosPorCategoria,
      rendimientoProductos,
    };
  }

  async calculateMetricasFinancieras(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasFinancieras> {
    this.logger.log(
      `Calculando métricas financieras para empresa ${empresaId}`,
    );

    // Obtener ingresos (ventas)
    const ventasMetricas = await this.calculateMetricasVentas(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    // Obtener costos (compras)
    const comprasMetricas = await this.calculateMetricasCompras(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    const ingresosTotales = ventasMetricas.totalVentas;
    const costosTotales = comprasMetricas.totalCompras;
    const utilidadBruta = ingresosTotales.sub(costosTotales);
    const margenBruto = ingresosTotales.gt(0)
      ? utilidadBruta.div(ingresosTotales).mul(100)
      : new Decimal(0);

    const igvRecaudado = ventasMetricas.igvTotal;
    const igvPagado = comprasMetricas.igvTotal;
    const flujoEfectivo = utilidadBruta; // Simplificado

    // Rentabilidad sobre ventas
    const rentabilidad = ingresosTotales.gt(0)
      ? utilidadBruta.div(ingresosTotales).mul(100)
      : new Decimal(0);

    const indicadoresFinancieros = {
      liquidez: this.calculateIndicadorLiquidez(empresaId),
      endeudamiento: this.calculateIndicadorEndeudamiento(empresaId),
      rentabilidad_activos: this.calculateRentabilidadActivos(empresaId),
      rotacion_inventario: await this.calculateRotacionPromedio(empresaId),
    };

    this.logger.log(
      `Métricas financieras calculadas: Ingresos S/ ${ingresosTotales.toFixed(2)}, Utilidad S/ ${utilidadBruta.toFixed(2)}`,
    );

    return {
      ingresosTotales,
      costosTotales,
      utilidadBruta,
      margenBruto,
      igvRecaudado,
      igvPagado,
      flujoEfectivo,
      rentabilidad,
      indicadoresFinancieros,
    };
  }

  /**
   * Calcula métricas específicas de WhatsApp para reportes
   * Integra datos de Evolution API, notificaciones y auditoría
   */
  async calculateMetricasWhatsapp(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
    parametros?: any,
  ): Promise<IMetricasWhatsapp> {
    this.logger.log(
      `Calculando métricas de WhatsApp para empresa ${empresaId}`,
    );

    const fechaInicioFinal =
      fechaInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días por defecto
    const fechaFinFinal = fechaFin || new Date();

    try {
      // 1. Obtener instancias de WhatsApp de la empresa
      const instancias = await this.prisma.evolutionInstance.findMany({
        where: {
          id_empresa: empresaId,
          // fecha_creacion: {
          //   gte: fechaInicioFinal,
          //   lte: fechaFinFinal,
          // },
        },
        // include: {
        //   configuracion: true,
        // },
      });

      // 2. Obtener notificaciones de WhatsApp
      const notificacionesWhatsapp = await this.prisma.notificacion.findMany({
        where: {
          id_empresa: empresaId,
          tipo_notificacion: 'WHATSAPP',
          fecha_notificacion: {
            gte: fechaInicioFinal,
            lte: fechaFinFinal,
          },
        },
      });

      // 3. Obtener auditorías de WhatsApp
      const auditoriasWhatsapp = await this.prisma.auditoria.findMany({
        where: {
          empresa_id: empresaId,
          recurso: 'whatsapp',
          fecha_evento: {
            gte: fechaInicioFinal,
            lte: fechaFinFinal,
          },
        },
      });

      // 4. Calcular métricas básicas
      const totalInstancias = instancias.length;
      const instanciasConectadas = instancias.filter(
        (i) => i.estado_conexion === 'conectado',
      ).length;

      // Simular datos de mensajes basados en notificaciones y auditorías
      const totalMensajes =
        notificacionesWhatsapp.length + auditoriasWhatsapp.length;
      const mensajesEnviados = auditoriasWhatsapp.filter(
        (a) => a.accion.includes('ENVIO') || a.accion.includes('SEND'),
      ).length;
      const mensajesRecibidos = notificacionesWhatsapp.filter(
        (n) =>
          n.contenido?.includes('mensaje entrante') ||
          n.titulo?.includes('Nuevo mensaje'),
      ).length;

      // 5. Métricas de conversaciones (estimadas basadas en patrones)
      const conversacionesUnicas = new Set(
        notificacionesWhatsapp
          .filter((n) => {
            const datos = n.datos_adicionales as any;
            return datos && typeof datos === 'object' && datos.numero_telefono;
          })
          .map((n) => {
            const datos = n.datos_adicionales as any;
            return datos.numero_telefono;
          }),
      );
      const totalConversaciones = conversacionesUnicas.size;
      const conversacionesActivas = Math.floor(totalConversaciones * 0.7); // Estimación 70% activas

      // 6. Tiempo de respuesta promedio (simulado)
      const tiempoRespuestaPromedio = this.calculateTiempoRespuestaPromedio(
        notificacionesWhatsapp,
      );

      // 7. Tasa de respuesta
      const tasaRespuesta =
        mensajesEnviados > 0
          ? Math.min(
              100,
              Math.round(
                (mensajesEnviados / Math.max(mensajesRecibidos, 1)) * 100,
              ),
            )
          : 0;

      // 8. Agrupar mensajes por período
      const mensajesPorPeriodo = this.agruparMensajesPorPeriodo(
        notificacionesWhatsapp,
        auditoriasWhatsapp,
        parametros?.agrupar_por || 'dia',
      );

      // 9. Top conversaciones (simuladas)
      const topConversaciones = this.calculateTopConversaciones(
        notificacionesWhatsapp,
      );

      // 10. Top instancias por performance
      const topInstancias = this.calculateTopInstancias(
        instancias,
        auditoriasWhatsapp,
      );

      // 11. Alertas de WhatsApp
      const alertasWhatsapp = this.generateAlertasWhatsapp(
        instancias,
        notificacionesWhatsapp,
        parametros,
      );

      const metricas: IMetricasWhatsapp = {
        totalMensajes,
        mensajesEnviados,
        mensajesRecibidos,
        totalConversaciones,
        conversacionesActivas,
        totalInstancias,
        instanciasConectadas,
        tiempoRespuestaPromedio,
        tasaRespuesta,
        notificacionesWhatsapp: notificacionesWhatsapp.length,
        mensajesPorPeriodo,
        topConversaciones,
        topInstancias,
        alertasWhatsapp,
      };

      this.logger.log(
        `Métricas de WhatsApp calculadas: ${totalMensajes} mensajes, ${totalInstancias} instancias, ${totalConversaciones} conversaciones`,
      );

      return metricas;
    } catch (error) {
      this.logger.error(
        `Error calculando métricas de WhatsApp: ${error.message}`,
        error.stack,
      );

      // Retornar métricas vacías en caso de error
      return {
        totalMensajes: 0,
        mensajesEnviados: 0,
        mensajesRecibidos: 0,
        totalConversaciones: 0,
        conversacionesActivas: 0,
        totalInstancias: 0,
        instanciasConectadas: 0,
        tiempoRespuestaPromedio: 0,
        tasaRespuesta: 0,
        notificacionesWhatsapp: 0,
        mensajesPorPeriodo: [],
        topConversaciones: [],
        topInstancias: [],
        alertasWhatsapp: [],
      };
    }
  }

  /**
   * Calcula tiempo de respuesta promedio basado en notificaciones
   */
  private calculateTiempoRespuestaPromedio(notificaciones: any[]): number {
    if (notificaciones.length === 0) return 0;

    // Simular tiempo de respuesta basado en velocidad de lectura de notificaciones
    const tiemposRespuesta = notificaciones
      .filter((n) => n.fecha_leida)
      .map((n) => {
        const tiempoLectura =
          new Date(n.fecha_leida).getTime() -
          new Date(n.fecha_creacion).getTime();
        return Math.round(tiempoLectura / (1000 * 60)); // Convertir a minutos
      })
      .filter((tiempo) => tiempo > 0 && tiempo < 1440); // Filtrar tiempos razonables (< 24 horas)

    if (tiemposRespuesta.length === 0) return 15; // Default 15 minutos

    return Math.round(
      tiemposRespuesta.reduce((sum, tiempo) => sum + tiempo, 0) /
        tiemposRespuesta.length,
    );
  }

  /**
   * Agrupa mensajes por período específico
   */
  private agruparMensajesPorPeriodo(
    notificaciones: any[],
    auditorias: any[],
    tipoAgrupacion: string,
  ): any[] {
    const grupos = new Map();

    [...notificaciones, ...auditorias].forEach((item) => {
      const fecha = new Date(item.fecha_creacion || item.fecha);
      let clave: string;

      switch (tipoAgrupacion) {
        case 'hora':
          clave = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')} ${fecha.getHours().toString().padStart(2, '0')}`;
          break;
        case 'dia':
          clave = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}`;
          break;
        case 'mes':
          clave = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          clave = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}`;
      }

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          periodo: clave,
          total: 0,
          enviados: 0,
          recibidos: 0,
        });
      }

      const grupo = grupos.get(clave);
      grupo.total++;

      // Clasificar como enviado o recibido basado en el tipo
      if (
        item.accion &&
        (item.accion.includes('ENVIO') || item.accion.includes('SEND'))
      ) {
        grupo.enviados++;
      } else {
        grupo.recibidos++;
      }
    });

    return Array.from(grupos.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    );
  }

  /**
   * Calcula top conversaciones basadas en actividad de notificaciones
   */
  private calculateTopConversaciones(notificaciones: any[]): any[] {
    const conversaciones = new Map();

    notificaciones.forEach((notif) => {
      const telefono =
        notif.datos_adicionales?.numero_telefono ||
        notif.datos_adicionales?.from ||
        'Desconocido';

      if (!conversaciones.has(telefono)) {
        conversaciones.set(telefono, {
          numero_telefono: telefono,
          nombre_contacto: notif.datos_adicionales?.nombre_contacto,
          total_mensajes: 0,
          ultima_actividad: notif.fecha_creacion,
          tiempo_respuesta_promedio: 15,
        });
      }

      const conv = conversaciones.get(telefono);
      conv.total_mensajes++;

      if (new Date(notif.fecha_creacion) > new Date(conv.ultima_actividad)) {
        conv.ultima_actividad = notif.fecha_creacion;
      }
    });

    return Array.from(conversaciones.values())
      .sort((a, b) => b.total_mensajes - a.total_mensajes)
      .slice(0, 10); // Top 10
  }

  /**
   * Calcula top instancias por performance
   */
  private calculateTopInstancias(instancias: any[], auditorias: any[]): any[] {
    return instancias
      .map((instancia) => {
        const auditoriasInstancia = auditorias.filter(
          (a) =>
            a.metadatos?.id_instancia === instancia.id_instance ||
            a.metadatos?.instancia === instancia.nombre,
        );

        const uptime_porcentaje =
          instancia.estado_conexion === 'conectado' ? 95 : 50; // Simulado
        const mensajes_procesados = auditoriasInstancia.length;

        return {
          id_instancia: instancia.id_instance,
          nombre: instancia.nombre,
          total_mensajes: mensajes_procesados,
          uptime_porcentaje,
          tiempo_respuesta_promedio: 10, // Simulado
          conversaciones_activas: Math.floor(mensajes_procesados / 3), // Estimación
          eficiencia_score: Math.round(
            (uptime_porcentaje + (mensajes_procesados > 0 ? 90 : 50)) / 2,
          ),
        };
      })
      .sort((a, b) => b.eficiencia_score - a.eficiencia_score);
  }

  /**
   * Genera alertas específicas de WhatsApp
   */
  private generateAlertasWhatsapp(
    instancias: any[],
    notificaciones: any[],
    parametros?: any,
  ): any[] {
    const alertas: any[] = [];

    // Alerta de instancias desconectadas
    const instanciasDesconectadas = instancias.filter(
      (i) => i.estado_conexion !== 'conectado',
    );
    if (instanciasDesconectadas.length > 0) {
      alertas.push({
        tipo_alerta: 'INSTANCIA_DESCONECTADA',
        descripcion: `${instanciasDesconectadas.length} instancia(s) desconectada(s)`,
        instancia_afectada: instanciasDesconectadas
          .map((i) => i.nombre)
          .join(', '),
        valor_actual: instanciasDesconectadas.length.toString(),
        valor_umbral: '0',
        fecha_detectada: new Date(),
        estado: 'ACTIVA',
        prioridad: 'ALTA',
        acciones_recomendadas: [
          'Verificar conexión a internet',
          'Revisar configuración de Evolution API',
          'Contactar soporte técnico si persiste',
        ],
      });
    }

    // Alerta de mensajes pendientes
    const mensajesPendientes = notificaciones.filter(
      (n) => !n.fecha_leida,
    ).length;
    if (mensajesPendientes > 20) {
      alertas.push({
        tipo_alerta: 'MENSAJES_PENDIENTES',
        descripcion: `${mensajesPendientes} mensajes sin leer`,
        valor_actual: mensajesPendientes.toString(),
        valor_umbral: '20',
        fecha_detectada: new Date(),
        estado: 'ACTIVA',
        prioridad: 'MEDIA',
        acciones_recomendadas: [
          'Revisar bandeja de notificaciones',
          'Asignar más operadores',
          'Configurar respuestas automáticas',
        ],
      });
    }

    return alertas;
  }

  // Métodos auxiliares privados

  private buildVentasWhereClause(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): any {
    const whereClause: any = { id_empresa: empresaId };

    if (fechaInicio || fechaFin) {
      whereClause.fecha_emision = {};
      if (fechaInicio) whereClause.fecha_emision.gte = fechaInicio;
      if (fechaFin) whereClause.fecha_emision.lte = fechaFin;
    }

    return whereClause;
  }

  private buildComprasWhereClause(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): any {
    const whereClause: any = { id_empresa: empresaId };

    if (fechaInicio || fechaFin) {
      whereClause.fecha_emision = {};
      if (fechaInicio) whereClause.fecha_emision.gte = fechaInicio;
      if (fechaFin) whereClause.fecha_emision.lte = fechaFin;
    }

    return whereClause;
  }

  private async calculateCrecimientoVentas(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Promise<Decimal> {
    if (!fechaInicio || !fechaFin) return new Decimal(0);

    const diasPeriodo = Math.ceil(
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24),
    );

    const fechaInicioAnterior = new Date(fechaInicio);
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasPeriodo);
    const fechaFinAnterior = new Date(fechaInicio);

    const ventasActuales = await this.prisma.ordenVenta.aggregate({
      where: this.buildVentasWhereClause(empresaId, fechaInicio, fechaFin),
      _sum: { total: true },
    });

    const ventasAnteriores = await this.prisma.ordenVenta.aggregate({
      where: this.buildVentasWhereClause(
        empresaId,
        fechaInicioAnterior,
        fechaFinAnterior,
      ),
      _sum: { total: true },
    });

    const totalActual = new Decimal(ventasActuales._sum.total || 0);
    const totalAnterior = new Decimal(ventasAnteriores._sum.total || 0);

    if (totalAnterior.eq(0)) return new Decimal(0);

    return totalActual.sub(totalAnterior).div(totalAnterior).mul(100);
  }

  private async calculateCrecimientoCompras(
    empresaId: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Promise<Decimal> {
    // Similar a calculateCrecimientoVentas pero para compras
    if (!fechaInicio || !fechaFin) return new Decimal(0);

    const diasPeriodo = Math.ceil(
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24),
    );

    const fechaInicioAnterior = new Date(fechaInicio);
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasPeriodo);
    const fechaFinAnterior = new Date(fechaInicio);

    const comprasActuales = await this.prisma.ordenCompra.aggregate({
      where: this.buildComprasWhereClause(empresaId, fechaInicio, fechaFin),
      _sum: { total: true },
    });

    const comprasAnteriores = await this.prisma.ordenCompra.aggregate({
      where: this.buildComprasWhereClause(
        empresaId,
        fechaInicioAnterior,
        fechaFinAnterior,
      ),
      _sum: { total: true },
    });

    const totalActual = new Decimal(comprasActuales._sum.total || 0);
    const totalAnterior = new Decimal(comprasAnteriores._sum.total || 0);

    if (totalAnterior.eq(0)) return new Decimal(0);

    return totalActual.sub(totalAnterior).div(totalAnterior).mul(100);
  }

  private agruparVentasPorPeriodo(ventas: any[], agruparPor: string): any[] {
    // Implementar agrupación por día, semana, mes
    const grupos = new Map();

    ventas.forEach((venta) => {
      let clave: string;
      const fecha = new Date(venta.fecha_emision);

      switch (agruparPor) {
        case 'dia':
          clave = fecha.toISOString().split('T')[0];
          break;
        case 'semana':
          const inicioSemana = new Date(fecha);
          inicioSemana.setDate(fecha.getDate() - fecha.getDay());
          clave = inicioSemana.toISOString().split('T')[0];
          break;
        case 'mes':
          clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          clave = fecha.toISOString().split('T')[0];
      }

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          periodo: clave,
          total: new Decimal(0),
          cantidad: 0,
        });
      }

      const grupo = grupos.get(clave);
      grupo.total = grupo.total.add(venta.total);
      grupo.cantidad += 1;
    });

    return Array.from(grupos.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    );
  }

  private agruparComprasPorPeriodo(compras: any[], agruparPor: string): any[] {
    // Similar a agruparVentasPorPeriodo
    return this.agruparVentasPorPeriodo(compras, agruparPor);
  }

  private calculateTopProductosVentas(data: any[]): any[] {
    const productosMap = new Map();

    data.forEach((item) => {
      if (item.items) {
        item.items.forEach((itemVenta: any) => {
          const productoId =
            itemVenta.producto.id_producto || itemVenta.id_producto;
          const nombre = itemVenta.producto?.nombre || 'Producto sin nombre';

          if (!productosMap.has(productoId)) {
            productosMap.set(productoId, {
              id: productoId,
              nombre,
              cantidad: 0,
              total: new Decimal(0),
            });
          }

          const producto = productosMap.get(productoId);
          producto.cantidad += itemVenta.cantidad;
          producto.total = producto.total.add(itemVenta.subtotal);
        });
      }
    });

    return Array.from(productosMap.values())
      .sort((a, b) => b.total.sub(a.total).toNumber())
      .slice(0, 10);
  }

  private calculateTopClientesVentas(ventas: any[]): any[] {
    const clientesMap = new Map();

    ventas.forEach((venta) => {
      const clienteId = venta.cliente?.id_cliente || venta.id_cliente;
      const nombre = venta.cliente?.nombre || 'Cliente sin nombre';

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          id: clienteId,
          nombre,
          ordenes: 0,
          total: new Decimal(0),
        });
      }

      const cliente = clientesMap.get(clienteId);
      cliente.ordenes += 1;
      cliente.total = cliente.total.add(venta.total);
    });

    return Array.from(clientesMap.values())
      .sort((a, b) => b.total.sub(a.total).toNumber())
      .slice(0, 10);
  }

  private calculateTopProveedoresCompras(compras: any[]): any[] {
    const proveedoresMap = new Map();

    compras.forEach((compra) => {
      const proveedorId = compra.proveedor?.id_proveedor || compra.id_proveedor;
      const nombre = compra.proveedor?.nombre || 'Proveedor sin nombre';

      if (!proveedoresMap.has(proveedorId)) {
        proveedoresMap.set(proveedorId, {
          id: proveedorId,
          nombre,
          ordenes: 0,
          total: new Decimal(0),
        });
      }

      const proveedor = proveedoresMap.get(proveedorId);
      proveedor.ordenes += 1;
      proveedor.total = proveedor.total.add(compra.total);
    });

    return Array.from(proveedoresMap.values())
      .sort((a, b) => b.total.sub(a.total).toNumber())
      .slice(0, 10);
  }

  private calculateTopProductosCompras(compras: any[]): any[] {
    return this.calculateTopProductosVentas(compras);
  }

  private async calculateRotacionPromedio(empresaId: number): Promise<Decimal> {
    // Cálculo simplificado de rotación de inventario
    const productos = await this.prisma.productoServicio.count({
      where: { id_empresa: empresaId, es_servicio: false },
    });

    if (productos === 0) return new Decimal(0);

    // Simplificado: asumir rotación promedio de 12 veces al año
    return new Decimal(12);
  }

  private async calculateTopProductosRotacion(
    empresaId: number,
  ): Promise<any[]> {
    // Implementación simplificada
    return [];
  }

  private calculateValorPorCategoria(productos: any[]): any[] {
    const categoriasMap = new Map();

    productos.forEach((producto) => {
      const categoria = producto.categoria?.nombre || 'Sin categoría';
      const stock = producto.stock?.cantidad || 0;
      const valor = producto.precio.mul(stock);

      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, {
          categoria,
          productos: 0,
          valor_total: new Decimal(0),
        });
      }

      const cat = categoriasMap.get(categoria);
      cat.productos += 1;
      cat.valor_total = cat.valor_total.add(valor);
    });

    return Array.from(categoriasMap.values()).sort((a, b) =>
      b.valor_total.sub(a.valor_total).toNumber(),
    );
  }

  private calculateTopClientesPorValor(clientes: any[]): any[] {
    return clientes
      .map((ce) => {
        const totalCompras = ce.cliente.ordenesVenta.reduce(
          (sum: Decimal, orden: any) => sum.add(orden.total),
          new Decimal(0),
        );

        return {
          id: ce.cliente.id_cliente,
          nombre: ce.cliente.nombre,
          tipo: ce.cliente.tipo_cliente,
          ordenes: ce.cliente.ordenesVenta.length,
          total_compras: totalCompras,
        };
      })
      .sort((a, b) => b.total_compras.sub(a.total_compras).toNumber())
      .slice(0, 10);
  }

  private calculateClientesPorTipo(clientes: any[]): any[] {
    const tiposMap = new Map();

    clientes.forEach((ce) => {
      const tipo = ce.cliente.tipo_cliente || 'individual';

      if (!tiposMap.has(tipo)) {
        tiposMap.set(tipo, { tipo, cantidad: 0 });
      }

      tiposMap.get(tipo).cantidad += 1;
    });

    return Array.from(tiposMap.values());
  }

  private calculateRetencionClientes(
    clientes: any[],
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Decimal {
    if (!fechaInicio || !fechaFin) return new Decimal(0);

    const clientesConCompras = clientes.filter(
      (ce) => ce.cliente.ordenesVenta.length > 0,
    ).length;

    const totalClientes = clientes.length;

    return totalClientes > 0
      ? new Decimal(clientesConCompras).div(totalClientes).mul(100)
      : new Decimal(0);
  }

  private async calculateMargenPromedioProductos(
    productos: any[],
  ): Promise<Decimal> {
    // Cálculo simplificado del margen promedio
    // En un escenario real, necesitaríamos el costo de cada producto
    return new Decimal(25); // 25% margen promedio estimado
  }

  private calculateTopProductosMargen(productos: any[]): any[] {
    // Implementación simplificada
    return productos.slice(0, 10).map((producto) => ({
      id: producto.id_producto,
      nombre: producto.nombre,
      precio_venta: producto.precio,
      margen_estimado: new Decimal(25), // Simplificado
    }));
  }

  private calculateProductosPorCategoria(productos: any[]): any[] {
    return this.calculateValorPorCategoria(productos);
  }

  private calculateRendimientoProductos(productos: any[]): any[] {
    return productos.map((producto) => {
      const ventasTotales = producto.items_orden_venta.reduce(
        (sum: Decimal, item: any) => sum.add(item.subtotal),
        new Decimal(0),
      );

      return {
        id: producto.id_producto,
        nombre: producto.nombre,
        ventas_totales: ventasTotales,
        stock_actual: producto.stock?.cantidad || 0,
        categoria: producto.categoria?.nombre,
        rendimiento: ventasTotales.div(producto.precio), // Simplificado
      };
    });
  }

  private calculateIndicadorLiquidez(empresaId: number): Decimal {
    // Implementación simplificada
    return new Decimal(1.5); // Ratio de liquidez estimado
  }

  private calculateIndicadorEndeudamiento(empresaId: number): Decimal {
    // Implementación simplificada
    return new Decimal(30); // 30% endeudamiento estimado
  }

  private calculateRentabilidadActivos(empresaId: number): Decimal {
    // Implementación simplificada
    return new Decimal(15); // 15% ROA estimado
  }
}
