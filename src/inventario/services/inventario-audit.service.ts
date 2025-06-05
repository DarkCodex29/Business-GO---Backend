import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoMovimientoStock } from '../dto/movimiento-stock.dto';

export interface IMovimientoAuditoria {
  productoId: number;
  usuarioId: number;
  empresaId: number;
  tipoMovimiento: TipoMovimientoStock;
  cantidadAnterior: number;
  cantidadNueva: number;
  cantidadMovimiento: number;
  motivo: string;
  referencia?: string; // ID de venta, compra, ajuste, etc.
  tipoReferencia?:
    | 'VENTA'
    | 'COMPRA'
    | 'AJUSTE'
    | 'TRANSFERENCIA'
    | 'DEVOLUCION';
  observaciones?: string;
  metadatos?: any;
}

export interface IHistorialMovimiento {
  fechaInicio?: Date;
  fechaFin?: Date;
  productoId?: number;
  usuarioId?: number;
  tipoMovimiento?: TipoMovimientoStock;
  tipoReferencia?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InventarioAuditService {
  private readonly logger = new Logger(InventarioAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un movimiento de inventario en la auditoría
   */
  async registrarMovimiento(movimiento: IMovimientoAuditoria): Promise<any> {
    try {
      // Validar que el producto existe
      const producto = await this.prisma.productoServicio.findUnique({
        where: { id_producto: movimiento.productoId },
        select: { nombre: true, id_empresa: true },
      });

      if (!producto) {
        throw new Error(`Producto ${movimiento.productoId} no encontrado`);
      }

      if (producto.id_empresa !== movimiento.empresaId) {
        throw new Error('El producto no pertenece a la empresa especificada');
      }

      // Crear el registro de auditoría usando la tabla existente
      const registroAuditoria = await this.prisma.auditoriaCambio.create({
        data: {
          tabla_nombre: 'stock',
          id_registro: movimiento.productoId,
          id_usuario: movimiento.usuarioId,
          tipo_operacion: `INVENTARIO_${movimiento.tipoMovimiento}`,
          detalles_cambio: {
            tipo_movimiento: movimiento.tipoMovimiento,
            cantidad_anterior: movimiento.cantidadAnterior,
            cantidad_nueva: movimiento.cantidadNueva,
            cantidad_movimiento: movimiento.cantidadMovimiento,
            motivo: movimiento.motivo,
            referencia: movimiento.referencia,
            tipo_referencia: movimiento.tipoReferencia,
            observaciones: movimiento.observaciones,
            producto_nombre: producto.nombre,
            ...movimiento.metadatos,
          },
          ip_address: '127.0.0.1', // TODO: Obtener IP real del request
          user_agent: 'BusinessGo-Inventario-System',
        },
      });

      this.logger.log(
        `Movimiento registrado: ${movimiento.tipoMovimiento} - Producto: ${producto.nombre} - Cantidad: ${movimiento.cantidadMovimiento} - Usuario: ${movimiento.usuarioId}`,
      );

      return registroAuditoria;
    } catch (error) {
      this.logger.error(
        `Error al registrar movimiento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene el historial de movimientos con filtros
   */
  async obtenerHistorialMovimientos(
    empresaId: number,
    filtros: IHistorialMovimiento = {},
  ): Promise<any> {
    const {
      fechaInicio,
      fechaFin,
      productoId,
      usuarioId,
      tipoMovimiento,
      tipoReferencia,
      page = 1,
      limit = 50,
    } = filtros;

    const skip = (page - 1) * limit;

    // Construir filtros dinámicos
    const whereClause: any = {
      tabla_nombre: 'stock',
      tipo_operacion: {
        startsWith: 'INVENTARIO_',
      },
    };

    // Filtro por fechas
    if (fechaInicio || fechaFin) {
      whereClause.fecha_accion = {};
      if (fechaInicio) whereClause.fecha_accion.gte = fechaInicio;
      if (fechaFin) whereClause.fecha_accion.lte = fechaFin;
    }

    // Filtro por usuario
    if (usuarioId) {
      whereClause.id_usuario = usuarioId;
    }

    // Filtro por producto específico
    if (productoId) {
      whereClause.id_registro = productoId;
    }

    // Filtros específicos en detalles_cambio (usando JSON queries)
    const jsonFilters: any = {};
    if (tipoMovimiento) {
      jsonFilters.tipo_movimiento = tipoMovimiento;
    }
    if (tipoReferencia) {
      jsonFilters.tipo_referencia = tipoReferencia;
    }

    // Aplicar filtros JSON si existen
    if (Object.keys(jsonFilters).length > 0) {
      whereClause.detalles_cambio = {
        path: Object.keys(jsonFilters),
        equals: Object.values(jsonFilters),
      };
    }

    // Ejecutar consultas en paralelo
    const [movimientos, total] = await Promise.all([
      this.prisma.auditoriaCambio.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: {
          fecha_accion: 'desc',
        },
      }),
      this.prisma.auditoriaCambio.count({ where: whereClause }),
    ]);

    // Enriquecer con información del producto
    const movimientosEnriquecidos = await Promise.all(
      movimientos.map(async (mov) => {
        const producto = await this.prisma.productoServicio.findUnique({
          where: { id_producto: mov.id_registro },
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            categoria: { select: { nombre: true } },
          },
        });

        return {
          ...mov,
          producto,
          detalles: mov.detalles_cambio as any,
        };
      }),
    );

    return {
      data: movimientosEnriquecidos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene estadísticas de movimientos por período
   */
  async obtenerEstadisticasMovimientos(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<any> {
    const whereClause = {
      tabla_nombre: 'stock',
      tipo_operacion: {
        startsWith: 'INVENTARIO_',
      },
      fecha_accion: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    // Obtener todos los movimientos del período
    const movimientos = await this.prisma.auditoriaCambio.findMany({
      where: whereClause,
      select: {
        tipo_operacion: true,
        detalles_cambio: true,
        fecha_accion: true,
      },
    });

    // Procesar estadísticas
    const stats = {
      totalMovimientos: movimientos.length,
      movimientosPorTipo: {} as Record<string, number>,
      movimientosPorDia: {} as Record<string, number>,
      productosAfectados: new Set(),
      usuariosActivos: new Set(),
    };

    movimientos.forEach((mov) => {
      const tipoMovimiento = mov.tipo_operacion.replace('INVENTARIO_', '');
      const fecha = mov.fecha_accion.toISOString().split('T')[0];
      const detalles = mov.detalles_cambio as any;

      // Contar por tipo
      stats.movimientosPorTipo[tipoMovimiento] =
        (stats.movimientosPorTipo[tipoMovimiento] || 0) + 1;

      // Contar por día
      stats.movimientosPorDia[fecha] =
        (stats.movimientosPorDia[fecha] || 0) + 1;

      // Productos únicos afectados
      if (detalles?.producto_nombre) {
        stats.productosAfectados.add(detalles.producto_nombre);
      }
    });

    return {
      ...stats,
      productosAfectados: stats.productosAfectados.size,
      usuariosActivos: stats.usuariosActivos.size,
    };
  }

  /**
   * Valida la consistencia del inventario
   */
  async validarConsistenciaInventario(empresaId: number): Promise<any> {
    // Obtener todos los productos de la empresa
    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
        es_servicio: false,
      },
      include: {
        stock: true,
        disponibilidad: true,
      },
    });

    const inconsistencias: any[] = [];

    for (const producto of productos) {
      const issues: string[] = [];

      // Verificar que existe registro de stock
      if (!producto.stock) {
        issues.push('Sin registro de stock');
      }

      // Verificar que existe registro de disponibilidad
      if (!producto.disponibilidad) {
        issues.push('Sin registro de disponibilidad');
      }

      // Verificar consistencia entre stock y disponibilidad
      if (producto.stock && producto.disponibilidad) {
        if (
          producto.disponibilidad.cantidad_disponible > producto.stock.cantidad
        ) {
          issues.push(
            `Disponibilidad (${producto.disponibilidad.cantidad_disponible}) mayor que stock (${producto.stock.cantidad})`,
          );
        }
      }

      // Verificar valores negativos
      if (producto.stock && producto.stock.cantidad < 0) {
        issues.push(`Stock negativo: ${producto.stock.cantidad}`);
      }

      if (
        producto.disponibilidad &&
        producto.disponibilidad.cantidad_disponible < 0
      ) {
        issues.push(
          `Disponibilidad negativa: ${producto.disponibilidad.cantidad_disponible}`,
        );
      }

      if (issues.length > 0) {
        inconsistencias.push({
          producto: {
            id: producto.id_producto,
            nombre: producto.nombre,
          },
          problemas: issues,
        });
      }
    }

    return {
      fechaValidacion: new Date(),
      totalProductos: productos.length,
      productosConInconsistencias: inconsistencias.length,
      porcentajeConsistencia:
        productos.length > 0
          ? Math.round(
              ((productos.length - inconsistencias.length) / productos.length) *
                100,
            )
          : 100,
      inconsistencias,
    };
  }

  /**
   * Genera reporte de auditoría en formato exportable
   */
  async generarReporteAuditoria(
    empresaId: number,
    filtros: IHistorialMovimiento = {},
  ): Promise<any> {
    const historial = await this.obtenerHistorialMovimientos(
      empresaId,
      filtros,
    );

    const reporte = {
      metadatos: {
        empresaId,
        fechaGeneracion: new Date(),
        filtros,
        totalRegistros: historial.meta.total,
      },
      resumen: {
        movimientosPorTipo: {},
        productosAfectados: new Set(),
        usuariosInvolucrados: new Set(),
      },
      movimientos: historial.data.map((mov) => ({
        fecha: mov.fecha_accion,
        usuario: mov.usuario.nombre,
        producto: mov.producto?.nombre || 'Producto no encontrado',
        tipoMovimiento: mov.detalles.tipo_movimiento,
        cantidadAnterior: mov.detalles.cantidad_anterior,
        cantidadNueva: mov.detalles.cantidad_nueva,
        cantidadMovimiento: mov.detalles.cantidad_movimiento,
        motivo: mov.detalles.motivo,
        referencia: mov.detalles.referencia,
        tipoReferencia: mov.detalles.tipo_referencia,
      })),
    };

    // Calcular resumen
    reporte.movimientos.forEach((mov) => {
      reporte.resumen.movimientosPorTipo[mov.tipoMovimiento] =
        (reporte.resumen.movimientosPorTipo[mov.tipoMovimiento] || 0) + 1;
      reporte.resumen.productosAfectados.add(mov.producto);
      reporte.resumen.usuariosInvolucrados.add(mov.usuario);
    });

    return {
      ...reporte,
      resumen: {
        ...reporte.resumen,
        productosAfectados: reporte.resumen.productosAfectados.size,
        usuariosInvolucrados: reporte.resumen.usuariosInvolucrados.size,
      },
    };
  }
}
