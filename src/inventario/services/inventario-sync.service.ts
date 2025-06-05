import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InventarioAuditService,
  IMovimientoAuditoria,
} from './inventario-audit.service';
import { TipoMovimientoStock } from '../dto/movimiento-stock.dto';

export interface ISyncVenta {
  ventaId: number;
  empresaId: number;
  usuarioId: number;
  items: {
    productoId: number;
    cantidad: number;
    precio: number;
  }[];
  tipoOperacion: 'CONFIRMAR' | 'CANCELAR' | 'DEVOLVER';
}

export interface ISyncCompra {
  compraId: number;
  empresaId: number;
  usuarioId: number;
  items: {
    productoId: number;
    cantidad: number;
    precio: number;
  }[];
  tipoOperacion: 'RECIBIR' | 'CANCELAR' | 'DEVOLVER';
}

export interface ISyncReserva {
  cotizacionId: number;
  empresaId: number;
  usuarioId: number;
  items: {
    productoId: number;
    cantidad: number;
  }[];
  tipoOperacion: 'RESERVAR' | 'LIBERAR';
}

export interface IResultadoSync {
  success: boolean;
  productosAfectados: number;
  movimientosRegistrados: number;
  alertasGeneradas: string[];
  errores: string[];
  detalles: any[];
}

@Injectable()
export class InventarioSyncService {
  private readonly logger = new Logger(InventarioSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: InventarioAuditService,
  ) {}

  /**
   * Sincroniza inventario con operación de venta
   */
  async sincronizarVenta(operacion: ISyncVenta): Promise<IResultadoSync> {
    this.logger.log(
      `Sincronizando venta ${operacion.ventaId} - ${operacion.tipoOperacion}`,
    );

    const resultado: IResultadoSync = {
      success: true,
      productosAfectados: 0,
      movimientosRegistrados: 0,
      alertasGeneradas: [],
      errores: [],
      detalles: [],
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of operacion.items) {
          try {
            const detalleMovimiento = await this.procesarItemVenta(
              tx,
              operacion,
              item,
            );

            resultado.detalles.push(detalleMovimiento);
            resultado.productosAfectados++;
            resultado.movimientosRegistrados++;
          } catch (error) {
            resultado.errores.push(
              `Producto ${item.productoId}: ${error.message}`,
            );
            resultado.success = false;
          }
        }
      });

      // Registrar auditoría después de la transacción
      await this.registrarAuditoriaVenta(operacion, resultado);
    } catch (error) {
      this.logger.error(
        `Error en sincronización de venta: ${error.message}`,
        error.stack,
      );
      resultado.success = false;
      resultado.errores.push(error.message);
    }

    return resultado;
  }

  /**
   * Sincroniza inventario con operación de compra
   */
  async sincronizarCompra(operacion: ISyncCompra): Promise<IResultadoSync> {
    this.logger.log(
      `Sincronizando compra ${operacion.compraId} - ${operacion.tipoOperacion}`,
    );

    const resultado: IResultadoSync = {
      success: true,
      productosAfectados: 0,
      movimientosRegistrados: 0,
      alertasGeneradas: [],
      errores: [],
      detalles: [],
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of operacion.items) {
          try {
            const detalleMovimiento = await this.procesarItemCompra(
              tx,
              operacion,
              item,
            );

            resultado.detalles.push(detalleMovimiento);
            resultado.productosAfectados++;
            resultado.movimientosRegistrados++;
          } catch (error) {
            resultado.errores.push(
              `Producto ${item.productoId}: ${error.message}`,
            );
            resultado.success = false;
          }
        }
      });

      // Registrar auditoría después de la transacción
      await this.registrarAuditoriaCompra(operacion, resultado);
    } catch (error) {
      this.logger.error(
        `Error en sincronización de compra: ${error.message}`,
        error.stack,
      );
      resultado.success = false;
      resultado.errores.push(error.message);
    }

    return resultado;
  }

  /**
   * Gestiona reservas de stock para cotizaciones
   */
  async gestionarReserva(operacion: ISyncReserva): Promise<IResultadoSync> {
    this.logger.log(
      `Gestionando reserva ${operacion.cotizacionId} - ${operacion.tipoOperacion}`,
    );

    const resultado: IResultadoSync = {
      success: true,
      productosAfectados: 0,
      movimientosRegistrados: 0,
      alertasGeneradas: [],
      errores: [],
      detalles: [],
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of operacion.items) {
          try {
            const detalleMovimiento = await this.procesarReserva(
              tx,
              operacion,
              item,
            );

            resultado.detalles.push(detalleMovimiento);
            resultado.productosAfectados++;
            resultado.movimientosRegistrados++;
          } catch (error) {
            resultado.errores.push(
              `Producto ${item.productoId}: ${error.message}`,
            );
            resultado.success = false;
          }
        }
      });

      // Registrar auditoría después de la transacción
      await this.registrarAuditoriaReserva(operacion, resultado);
    } catch (error) {
      this.logger.error(
        `Error en gestión de reserva: ${error.message}`,
        error.stack,
      );
      resultado.success = false;
      resultado.errores.push(error.message);
    }

    return resultado;
  }

  /**
   * Procesa un item de venta
   */
  private async procesarItemVenta(
    tx: any,
    operacion: ISyncVenta,
    item: any,
  ): Promise<any> {
    // Obtener stock actual
    const stock = await tx.stock.findUnique({
      where: { id_producto: item.productoId },
      include: {
        producto: {
          select: { nombre: true, es_servicio: true },
        },
      },
    });

    if (!stock) {
      throw new Error(
        `No existe registro de stock para el producto ${item.productoId}`,
      );
    }

    if (stock.producto.es_servicio) {
      // Los servicios no afectan el inventario
      return {
        productoId: item.productoId,
        tipoMovimiento: 'SERVICIO',
        cantidadAnterior: stock.cantidad,
        cantidadNueva: stock.cantidad,
        observacion: 'Servicio - No afecta inventario',
      };
    }

    let nuevaCantidad = stock.cantidad;
    let tipoMovimiento: TipoMovimientoStock;
    let motivo: string;

    switch (operacion.tipoOperacion) {
      case 'CONFIRMAR':
        // Reducir stock por venta
        if (stock.cantidad < item.cantidad) {
          throw new Error(
            `Stock insuficiente. Disponible: ${stock.cantidad}, Requerido: ${item.cantidad}`,
          );
        }
        nuevaCantidad = stock.cantidad - item.cantidad;
        tipoMovimiento = TipoMovimientoStock.SALIDA;
        motivo = `Venta confirmada #${operacion.ventaId}`;
        break;

      case 'CANCELAR':
        // Restaurar stock por cancelación
        nuevaCantidad = stock.cantidad + item.cantidad;
        tipoMovimiento = TipoMovimientoStock.ENTRADA;
        motivo = `Cancelación de venta #${operacion.ventaId}`;
        break;

      case 'DEVOLVER':
        // Restaurar stock por devolución
        nuevaCantidad = stock.cantidad + item.cantidad;
        tipoMovimiento = TipoMovimientoStock.ENTRADA;
        motivo = `Devolución de venta #${operacion.ventaId}`;
        break;

      default:
        throw new Error(
          `Tipo de operación no válido: ${operacion.tipoOperacion}`,
        );
    }

    // Actualizar stock
    await tx.stock.update({
      where: { id_producto: item.productoId },
      data: { cantidad: nuevaCantidad },
    });

    // Actualizar disponibilidad si es necesario
    const disponibilidad = await tx.disponibilidad.findUnique({
      where: { id_producto: item.productoId },
    });

    if (disponibilidad) {
      let nuevaDisponibilidad = disponibilidad.cantidad_disponible;

      if (operacion.tipoOperacion === 'CONFIRMAR') {
        nuevaDisponibilidad = Math.max(0, nuevaDisponibilidad - item.cantidad);
      } else {
        nuevaDisponibilidad = Math.min(
          nuevaCantidad,
          nuevaDisponibilidad + item.cantidad,
        );
      }

      await tx.disponibilidad.update({
        where: { id_producto: item.productoId },
        data: { cantidad_disponible: nuevaDisponibilidad },
      });
    }

    // Registrar auditoría
    const movimientoAuditoria: IMovimientoAuditoria = {
      productoId: item.productoId,
      usuarioId: operacion.usuarioId,
      empresaId: operacion.empresaId,
      tipoMovimiento,
      cantidadAnterior: stock.cantidad,
      cantidadNueva: nuevaCantidad,
      cantidadMovimiento: item.cantidad,
      motivo,
      referencia: operacion.ventaId.toString(),
      tipoReferencia: 'VENTA',
      metadatos: {
        precio_venta: item.precio,
        tipo_operacion: operacion.tipoOperacion,
      },
    };

    await this.auditService.registrarMovimiento(movimientoAuditoria);

    return {
      productoId: item.productoId,
      nombreProducto: stock.producto.nombre,
      tipoMovimiento,
      cantidadAnterior: stock.cantidad,
      cantidadNueva: nuevaCantidad,
      cantidadMovimiento: item.cantidad,
      motivo,
    };
  }

  /**
   * Procesa un item de compra
   */
  private async procesarItemCompra(
    tx: any,
    operacion: ISyncCompra,
    item: any,
  ): Promise<any> {
    // Obtener stock actual
    const stock = await tx.stock.findUnique({
      where: { id_producto: item.productoId },
      include: {
        producto: {
          select: { nombre: true, es_servicio: true },
        },
      },
    });

    if (!stock) {
      throw new Error(
        `No existe registro de stock para el producto ${item.productoId}`,
      );
    }

    if (stock.producto.es_servicio) {
      return {
        productoId: item.productoId,
        tipoMovimiento: 'SERVICIO',
        cantidadAnterior: stock.cantidad,
        cantidadNueva: stock.cantidad,
        observacion: 'Servicio - No afecta inventario',
      };
    }

    let nuevaCantidad = stock.cantidad;
    let tipoMovimiento: TipoMovimientoStock;
    let motivo: string;

    switch (operacion.tipoOperacion) {
      case 'RECIBIR':
        // Incrementar stock por recepción
        nuevaCantidad = stock.cantidad + item.cantidad;
        tipoMovimiento = TipoMovimientoStock.ENTRADA;
        motivo = `Recepción de compra #${operacion.compraId}`;
        break;

      case 'CANCELAR':
        // Reducir stock por cancelación (si ya se había recibido)
        if (stock.cantidad < item.cantidad) {
          throw new Error(
            `No se puede cancelar. Stock actual: ${stock.cantidad}, A cancelar: ${item.cantidad}`,
          );
        }
        nuevaCantidad = stock.cantidad - item.cantidad;
        tipoMovimiento = TipoMovimientoStock.SALIDA;
        motivo = `Cancelación de compra #${operacion.compraId}`;
        break;

      case 'DEVOLVER':
        // Reducir stock por devolución al proveedor
        if (stock.cantidad < item.cantidad) {
          throw new Error(
            `No se puede devolver. Stock actual: ${stock.cantidad}, A devolver: ${item.cantidad}`,
          );
        }
        nuevaCantidad = stock.cantidad - item.cantidad;
        tipoMovimiento = TipoMovimientoStock.SALIDA;
        motivo = `Devolución a proveedor #${operacion.compraId}`;
        break;

      default:
        throw new Error(
          `Tipo de operación no válido: ${operacion.tipoOperacion}`,
        );
    }

    // Actualizar stock
    await tx.stock.update({
      where: { id_producto: item.productoId },
      data: { cantidad: nuevaCantidad },
    });

    // Actualizar disponibilidad
    const disponibilidad = await tx.disponibilidad.findUnique({
      where: { id_producto: item.productoId },
    });

    if (disponibilidad) {
      let nuevaDisponibilidad = disponibilidad.cantidad_disponible;

      if (operacion.tipoOperacion === 'RECIBIR') {
        nuevaDisponibilidad = nuevaDisponibilidad + item.cantidad;
      } else {
        nuevaDisponibilidad = Math.max(0, nuevaDisponibilidad - item.cantidad);
      }

      await tx.disponibilidad.update({
        where: { id_producto: item.productoId },
        data: {
          cantidad_disponible: Math.min(nuevaCantidad, nuevaDisponibilidad),
        },
      });
    }

    // Registrar auditoría
    const movimientoAuditoria: IMovimientoAuditoria = {
      productoId: item.productoId,
      usuarioId: operacion.usuarioId,
      empresaId: operacion.empresaId,
      tipoMovimiento,
      cantidadAnterior: stock.cantidad,
      cantidadNueva: nuevaCantidad,
      cantidadMovimiento: item.cantidad,
      motivo,
      referencia: operacion.compraId.toString(),
      tipoReferencia: 'COMPRA',
      metadatos: {
        precio_compra: item.precio,
        tipo_operacion: operacion.tipoOperacion,
      },
    };

    await this.auditService.registrarMovimiento(movimientoAuditoria);

    return {
      productoId: item.productoId,
      nombreProducto: stock.producto.nombre,
      tipoMovimiento,
      cantidadAnterior: stock.cantidad,
      cantidadNueva: nuevaCantidad,
      cantidadMovimiento: item.cantidad,
      motivo,
    };
  }

  /**
   * Procesa una reserva de stock
   */
  private async procesarReserva(
    tx: any,
    operacion: ISyncReserva,
    item: any,
  ): Promise<any> {
    // Obtener disponibilidad actual
    const disponibilidad = await tx.disponibilidad.findUnique({
      where: { id_producto: item.productoId },
      include: {
        producto: {
          select: { nombre: true, es_servicio: true },
        },
      },
    });

    if (!disponibilidad) {
      throw new Error(
        `No existe registro de disponibilidad para el producto ${item.productoId}`,
      );
    }

    if (disponibilidad.producto.es_servicio) {
      return {
        productoId: item.productoId,
        tipoMovimiento: 'SERVICIO',
        cantidadAnterior: disponibilidad.cantidad_disponible,
        cantidadNueva: disponibilidad.cantidad_disponible,
        observacion: 'Servicio - No requiere reserva',
      };
    }

    let nuevaDisponibilidad = disponibilidad.cantidad_disponible;
    let motivo: string;

    switch (operacion.tipoOperacion) {
      case 'RESERVAR':
        // Reducir disponibilidad por reserva
        if (disponibilidad.cantidad_disponible < item.cantidad) {
          throw new Error(
            `Disponibilidad insuficiente. Disponible: ${disponibilidad.cantidad_disponible}, Requerido: ${item.cantidad}`,
          );
        }
        nuevaDisponibilidad =
          disponibilidad.cantidad_disponible - item.cantidad;
        motivo = `Reserva para cotización #${operacion.cotizacionId}`;
        break;

      case 'LIBERAR':
        // Restaurar disponibilidad por liberación de reserva
        const stock = await tx.stock.findUnique({
          where: { id_producto: item.productoId },
        });

        nuevaDisponibilidad = Math.min(
          stock?.cantidad || 0,
          disponibilidad.cantidad_disponible + item.cantidad,
        );
        motivo = `Liberación de reserva cotización #${operacion.cotizacionId}`;
        break;

      default:
        throw new Error(
          `Tipo de operación no válido: ${operacion.tipoOperacion}`,
        );
    }

    // Actualizar disponibilidad
    await tx.disponibilidad.update({
      where: { id_producto: item.productoId },
      data: { cantidad_disponible: nuevaDisponibilidad },
    });

    return {
      productoId: item.productoId,
      nombreProducto: disponibilidad.producto.nombre,
      tipoMovimiento: 'RESERVA',
      cantidadAnterior: disponibilidad.cantidad_disponible,
      cantidadNueva: nuevaDisponibilidad,
      cantidadMovimiento: item.cantidad,
      motivo,
    };
  }

  /**
   * Registra auditoría para operaciones de venta
   */
  private async registrarAuditoriaVenta(
    operacion: ISyncVenta,
    resultado: IResultadoSync,
  ): Promise<void> {
    try {
      for (const detalle of resultado.detalles) {
        if (detalle.tipoMovimiento !== 'SERVICIO') {
          // La auditoría ya se registró en procesarItemVenta
          continue;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error registrando auditoría de venta: ${error.message}`,
      );
    }
  }

  /**
   * Registra auditoría para operaciones de compra
   */
  private async registrarAuditoriaCompra(
    operacion: ISyncCompra,
    resultado: IResultadoSync,
  ): Promise<void> {
    try {
      for (const detalle of resultado.detalles) {
        if (detalle.tipoMovimiento !== 'SERVICIO') {
          // La auditoría ya se registró en procesarItemCompra
          continue;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error registrando auditoría de compra: ${error.message}`,
      );
    }
  }

  /**
   * Registra auditoría para operaciones de reserva
   */
  private async registrarAuditoriaReserva(
    operacion: ISyncReserva,
    resultado: IResultadoSync,
  ): Promise<void> {
    try {
      // Las reservas se manejan en la disponibilidad, no generan movimientos de stock
      this.logger.log(
        `Reserva ${operacion.cotizacionId} procesada: ${resultado.productosAfectados} productos`,
      );
    } catch (error) {
      this.logger.error(
        `Error registrando auditoría de reserva: ${error.message}`,
      );
    }
  }

  /**
   * Valida la consistencia entre stock y reservas
   */
  async validarConsistenciaReservas(empresaId: number): Promise<any> {
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
      if (!producto.stock || !producto.disponibilidad) continue;

      if (
        producto.disponibilidad.cantidad_disponible > producto.stock.cantidad
      ) {
        inconsistencias.push({
          productoId: producto.id_producto,
          nombre: producto.nombre,
          stock: producto.stock.cantidad,
          disponible: producto.disponibilidad.cantidad_disponible,
          problema: 'Disponibilidad mayor que stock total',
        });
      }

      if (producto.disponibilidad.cantidad_disponible < 0) {
        inconsistencias.push({
          productoId: producto.id_producto,
          nombre: producto.nombre,
          stock: producto.stock.cantidad,
          disponible: producto.disponibilidad.cantidad_disponible,
          problema: 'Disponibilidad negativa',
        });
      }
    }

    return {
      totalProductos: productos.length,
      inconsistencias: inconsistencias.length,
      detalles: inconsistencias,
    };
  }

  /**
   * Reconcilia diferencias de inventario automáticamente
   */
  async reconciliarInventario(
    empresaId: number,
    usuarioId: number,
  ): Promise<IResultadoSync> {
    this.logger.log(
      `Iniciando reconciliación de inventario para empresa ${empresaId}`,
    );

    const resultado: IResultadoSync = {
      success: true,
      productosAfectados: 0,
      movimientosRegistrados: 0,
      alertasGeneradas: [],
      errores: [],
      detalles: [],
    };

    try {
      const inconsistencias = await this.validarConsistenciaReservas(empresaId);

      if (inconsistencias.inconsistencias === 0) {
        resultado.alertasGeneradas.push('No se encontraron inconsistencias');
        return resultado;
      }

      await this.prisma.$transaction(async (tx) => {
        for (const problema of inconsistencias.detalles) {
          try {
            if (problema.problema === 'Disponibilidad mayor que stock total') {
              // Ajustar disponibilidad al stock real
              await tx.disponibilidad.update({
                where: { id_producto: problema.productoId },
                data: { cantidad_disponible: problema.stock },
              });

              resultado.detalles.push({
                productoId: problema.productoId,
                accion: 'Disponibilidad ajustada al stock',
                valorAnterior: problema.disponible,
                valorNuevo: problema.stock,
              });
            }

            if (problema.problema === 'Disponibilidad negativa') {
              // Ajustar disponibilidad a 0
              await tx.disponibilidad.update({
                where: { id_producto: problema.productoId },
                data: { cantidad_disponible: 0 },
              });

              resultado.detalles.push({
                productoId: problema.productoId,
                accion: 'Disponibilidad negativa corregida',
                valorAnterior: problema.disponible,
                valorNuevo: 0,
              });
            }

            resultado.productosAfectados++;
          } catch (error) {
            resultado.errores.push(
              `Producto ${problema.productoId}: ${error.message}`,
            );
          }
        }
      });

      this.logger.log(
        `Reconciliación completada: ${resultado.productosAfectados} productos corregidos`,
      );
    } catch (error) {
      this.logger.error(
        `Error en reconciliación: ${error.message}`,
        error.stack,
      );
      resultado.success = false;
      resultado.errores.push(error.message);
    }

    return resultado;
  }
}
