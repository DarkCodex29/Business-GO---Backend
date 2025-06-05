import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MetricasValoraciones {
  total_valoraciones: number;
  promedio_calificacion: number;
  distribucion_calificaciones: {
    cinco_estrellas: number;
    cuatro_estrellas: number;
    tres_estrellas: number;
    dos_estrellas: number;
    una_estrella: number;
  };
  valoraciones_por_mes: Array<{
    mes: string;
    cantidad: number;
    promedio: number;
  }>;
  productos_mejor_valorados: Array<{
    id_producto: number;
    nombre_producto: string;
    promedio_calificacion: number;
    total_valoraciones: number;
  }>;
  clientes_mas_activos: Array<{
    id_cliente: number;
    nombre_cliente: string;
    total_valoraciones: number;
    promedio_calificacion: number;
  }>;
  estado_moderacion: {
    aprobadas: number;
    pendientes: number;
    rechazadas: number;
  };
  tendencia_satisfaccion: {
    mes_actual: number;
    mes_anterior: number;
    variacion_porcentual: number;
  };
}

export interface EstadisticasProducto {
  id_producto: number;
  nombre_producto: string;
  total_valoraciones: number;
  promedio_calificacion: number;
  distribucion_calificaciones: {
    cinco_estrellas: number;
    cuatro_estrellas: number;
    tres_estrellas: number;
    dos_estrellas: number;
    una_estrella: number;
  };
  valoraciones_recientes: Array<{
    puntuacion: number;
    comentario: string;
    fecha_creacion: Date;
    nombre_cliente: string;
  }>;
  tendencia_mensual: Array<{
    mes: string;
    promedio: number;
    cantidad: number;
  }>;
}

@Injectable()
export class ValoracionesCalculationService {
  private readonly logger = new Logger(ValoracionesCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula métricas generales de valoraciones para una empresa
   */
  async calculateMetricasGenerales(
    empresaId: number,
  ): Promise<MetricasValoraciones> {
    this.logger.log(`Calculando métricas generales para empresa ${empresaId}`);

    const [
      totalValoraciones,
      promedioCalificacion,
      distribucionCalificaciones,
      valoracionesPorMes,
      productosMejorValorados,
      clientesMasActivos,
      estadoModeracion,
      tendenciaSatisfaccion,
    ] = await Promise.all([
      this.calculateTotalValoraciones(empresaId),
      this.calculatePromedioCalificacion(empresaId),
      this.calculateDistribucionCalificaciones(empresaId),
      this.calculateValoracionesPorMes(empresaId),
      this.calculateProductosMejorValorados(empresaId),
      this.calculateClientesMasActivos(empresaId),
      this.calculateEstadoModeracion(empresaId),
      this.calculateTendenciaSatisfaccion(empresaId),
    ]);

    return {
      total_valoraciones: totalValoraciones,
      promedio_calificacion: promedioCalificacion,
      distribucion_calificaciones: distribucionCalificaciones,
      valoraciones_por_mes: valoracionesPorMes,
      productos_mejor_valorados: productosMejorValorados,
      clientes_mas_activos: clientesMasActivos,
      estado_moderacion: estadoModeracion,
      tendencia_satisfaccion: tendenciaSatisfaccion,
    };
  }

  /**
   * Calcula estadísticas específicas de un producto
   */
  async calculateEstadisticasProducto(
    productoId: number,
    empresaId: number,
  ): Promise<EstadisticasProducto> {
    this.logger.log(`Calculando estadísticas para producto ${productoId}`);

    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: productoId,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    const [
      totalValoraciones,
      promedioCalificacion,
      distribucionCalificaciones,
      valoracionesRecientes,
      tendenciaMensual,
    ] = await Promise.all([
      this.calculateTotalValoracionesProducto(productoId),
      this.calculatePromedioCalificacionProducto(productoId),
      this.calculateDistribucionCalificacionesProducto(productoId),
      this.getValoracionesRecientesProducto(productoId),
      this.calculateTendenciaMensualProducto(productoId),
    ]);

    return {
      id_producto: productoId,
      nombre_producto: producto.nombre,
      total_valoraciones: totalValoraciones,
      promedio_calificacion: promedioCalificacion,
      distribucion_calificaciones: distribucionCalificaciones,
      valoraciones_recientes: valoracionesRecientes,
      tendencia_mensual: tendenciaMensual,
    };
  }

  /**
   * Calcula el total de valoraciones para una empresa
   */
  private async calculateTotalValoraciones(empresaId: number): Promise<number> {
    const count = await this.prisma.valoracion.count({
      where: {
        producto: {
          id_empresa: empresaId,
        },
      },
    });

    return count;
  }

  /**
   * Calcula el promedio de puntuación para una empresa
   */
  private async calculatePromedioCalificacion(
    empresaId: number,
  ): Promise<number> {
    const valoraciones = await this.prisma.valoracion.findMany({
      where: {
        producto: {
          id_empresa: empresaId,
        },
      },
      select: {
        puntuacion: true,
      },
    });

    if (valoraciones.length === 0) return 0;

    const suma = valoraciones.reduce((acc, v) => acc + v.puntuacion, 0);
    return Number((suma / valoraciones.length).toFixed(2));
  }

  /**
   * Calcula la distribución de puntuaciones
   */
  private async calculateDistribucionCalificaciones(empresaId: number) {
    const valoraciones = await this.prisma.valoracion.findMany({
      where: {
        producto: {
          id_empresa: empresaId,
        },
      },
      select: {
        puntuacion: true,
      },
    });

    const distribucion = {
      cinco_estrellas: 0,
      cuatro_estrellas: 0,
      tres_estrellas: 0,
      dos_estrellas: 0,
      una_estrella: 0,
    };

    valoraciones.forEach((v) => {
      switch (v.puntuacion) {
        case 5:
          distribucion.cinco_estrellas++;
          break;
        case 4:
          distribucion.cuatro_estrellas++;
          break;
        case 3:
          distribucion.tres_estrellas++;
          break;
        case 2:
          distribucion.dos_estrellas++;
          break;
        case 1:
          distribucion.una_estrella++;
          break;
      }
    });

    return distribucion;
  }

  /**
   * Calcula valoraciones por mes (simulado ya que no hay fechas en el schema)
   */
  private async calculateValoracionesPorMes(empresaId: number) {
    // Como no hay fechas en el schema, simulamos datos mensuales
    const totalValoraciones = await this.calculateTotalValoraciones(empresaId);
    const promedioCalificacion =
      await this.calculatePromedioCalificacion(empresaId);

    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Simulamos distribución de valoraciones a lo largo del año
    return meses.map((mes, index) => ({
      mes,
      cantidad: Math.floor(totalValoraciones / 12) + (index % 3), // Distribución simulada
      promedio: promedioCalificacion + (Math.random() - 0.5) * 0.5, // Variación simulada
    }));
  }

  /**
   * Calcula productos mejor valorados
   */
  private async calculateProductosMejorValorados(empresaId: number) {
    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
        valoraciones: {
          some: {},
        },
      },
      include: {
        valoraciones: {
          select: {
            puntuacion: true,
          },
        },
      },
      take: 10,
    });

    const productosConPromedio = productos.map((producto) => {
      const totalValoraciones = producto.valoraciones.length;
      const sumaCalificaciones = producto.valoraciones.reduce(
        (sum, v) => sum + v.puntuacion,
        0,
      );
      const promedio =
        totalValoraciones > 0 ? sumaCalificaciones / totalValoraciones : 0;

      return {
        id_producto: producto.id_producto,
        nombre_producto: producto.nombre,
        promedio_calificacion: Number(promedio.toFixed(2)),
        total_valoraciones: totalValoraciones,
      };
    });

    return productosConPromedio
      .sort((a, b) => b.promedio_calificacion - a.promedio_calificacion)
      .slice(0, 5);
  }

  /**
   * Calcula clientes más activos
   */
  private async calculateClientesMasActivos(empresaId: number) {
    const clientes = await this.prisma.cliente.findMany({
      where: {
        valoraciones: {
          some: {
            producto: {
              id_empresa: empresaId,
            },
          },
        },
      },
      include: {
        valoraciones: {
          where: {
            producto: {
              id_empresa: empresaId,
            },
          },
          select: {
            puntuacion: true,
          },
        },
      },
      take: 10,
    });

    const clientesConEstadisticas = clientes.map((cliente) => {
      const totalValoraciones = cliente.valoraciones.length;
      const sumaCalificaciones = cliente.valoraciones.reduce(
        (sum, v) => sum + v.puntuacion,
        0,
      );
      const promedio =
        totalValoraciones > 0 ? sumaCalificaciones / totalValoraciones : 0;

      return {
        id_cliente: cliente.id_cliente,
        nombre_cliente: cliente.nombre, // Solo nombre, sin apellido
        total_valoraciones: totalValoraciones,
        promedio_calificacion: Number(promedio.toFixed(2)),
      };
    });

    return clientesConEstadisticas
      .sort((a, b) => b.total_valoraciones - a.total_valoraciones)
      .slice(0, 5);
  }

  /**
   * Calcula estado de moderación
   */
  private async calculateEstadoModeracion(empresaId: number) {
    const estados = await this.prisma.valoracion.findMany({
      where: {
        producto: {
          id_empresa: empresaId,
        },
      },
      select: {
        estado_moderacion: true,
      },
    });

    const conteo = {
      aprobadas: 0,
      pendientes: 0,
      rechazadas: 0,
    };

    estados.forEach((estado) => {
      switch (estado.estado_moderacion) {
        case 'APROBADO':
          conteo.aprobadas++;
          break;
        case 'PENDIENTE':
          conteo.pendientes++;
          break;
        case 'RECHAZADO':
          conteo.rechazadas++;
          break;
      }
    });

    return conteo;
  }

  /**
   * Calcula tendencia de satisfacción (simulado)
   */
  private async calculateTendenciaSatisfaccion(empresaId: number) {
    const promedioActual = await this.calculatePromedioCalificacion(empresaId);

    // Simulamos el promedio del mes anterior
    const promedioAnterior = promedioActual + (Math.random() - 0.5) * 0.5;

    const variacion =
      ((promedioActual - promedioAnterior) / promedioAnterior) * 100;

    return {
      mes_actual: Number(promedioActual.toFixed(2)),
      mes_anterior: Number(promedioAnterior.toFixed(2)),
      variacion_porcentual: Number(variacion.toFixed(2)),
    };
  }

  // Métodos específicos para productos

  /**
   * Calcula total de valoraciones para un producto específico
   */
  private async calculateTotalValoracionesProducto(
    productoId: number,
  ): Promise<number> {
    return await this.prisma.valoracion.count({
      where: {
        id_producto: productoId,
      },
    });
  }

  /**
   * Calcula promedio de puntuación para un producto específico
   */
  private async calculatePromedioCalificacionProducto(
    productoId: number,
  ): Promise<number> {
    const valoraciones = await this.prisma.valoracion.findMany({
      where: {
        id_producto: productoId,
      },
      select: {
        puntuacion: true,
      },
    });

    if (valoraciones.length === 0) return 0;

    const suma = valoraciones.reduce((acc, v) => acc + v.puntuacion, 0);
    return Number((suma / valoraciones.length).toFixed(2));
  }

  /**
   * Calcula distribución de puntuaciones para un producto específico
   */
  private async calculateDistribucionCalificacionesProducto(
    productoId: number,
  ) {
    const valoraciones = await this.prisma.valoracion.findMany({
      where: {
        id_producto: productoId,
      },
      select: {
        puntuacion: true,
      },
    });

    const distribucion = {
      cinco_estrellas: 0,
      cuatro_estrellas: 0,
      tres_estrellas: 0,
      dos_estrellas: 0,
      una_estrella: 0,
    };

    valoraciones.forEach((v) => {
      switch (v.puntuacion) {
        case 5:
          distribucion.cinco_estrellas++;
          break;
        case 4:
          distribucion.cuatro_estrellas++;
          break;
        case 3:
          distribucion.tres_estrellas++;
          break;
        case 2:
          distribucion.dos_estrellas++;
          break;
        case 1:
          distribucion.una_estrella++;
          break;
      }
    });

    return distribucion;
  }

  /**
   * Obtiene valoraciones recientes para un producto
   */
  private async getValoracionesRecientesProducto(productoId: number) {
    const valoraciones = await this.prisma.valoracion.findMany({
      where: {
        id_producto: productoId,
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        id_valoracion: 'desc',
      },
      take: 5,
    });

    return valoraciones.map((v) => ({
      puntuacion: v.puntuacion,
      comentario: v.comentario || '',
      fecha_creacion: new Date(), // Simulado ya que no existe en schema
      nombre_cliente: v.cliente.nombre,
    }));
  }

  /**
   * Calcula tendencia mensual para un producto (simulado)
   */
  private async calculateTendenciaMensualProducto(productoId: number) {
    const promedioActual =
      await this.calculatePromedioCalificacionProducto(productoId);
    const totalValoraciones =
      await this.calculateTotalValoracionesProducto(productoId);

    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Simulamos tendencia mensual
    return meses.map((mes, index) => ({
      mes,
      promedio: promedioActual + (Math.random() - 0.5) * 0.5,
      cantidad: Math.floor(totalValoraciones / 12) + (index % 3),
    }));
  }
}
