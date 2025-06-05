import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service';
import { TipoNotificacion } from '../../notificaciones/dto/create-notificacion.dto';

// Interfaces para automatización de compras
export interface IReglaAutomatizacionCompras {
  id: string;
  nombre: string;
  descripcion: string;
  condiciones: ICondicionAutomatizacionCompras[];
  acciones: IAccionAutomatizacionCompras[];
  activa: boolean;
  prioridad: number;
}

export interface ICondicionAutomatizacionCompras {
  campo: string;
  operador:
    | 'igual'
    | 'mayor'
    | 'menor'
    | 'contiene'
    | 'stock_minimo'
    | 'precio_incrementado';
  valor: any;
  tipo: 'orden' | 'proveedor' | 'stock' | 'precio' | 'tiempo';
}

export interface IAccionAutomatizacionCompras {
  tipo:
    | 'notificacion'
    | 'email'
    | 'whatsapp'
    | 'orden_automatica'
    | 'alerta_precio'
    | 'seguimiento';
  parametros: any;
  destinatario?: string;
  prioridad?: 'alta' | 'media' | 'baja';
}

export interface IGestionProveedor {
  id_proveedor: number;
  nombre: string;
  estado: 'ACTIVO' | 'EVALUACION' | 'SUSPENDIDO' | 'INACTIVO';
  score: number;
  ultimaEvaluacion: Date;
  proximaEvaluacion: Date;
  alertas: string[];
  recomendaciones: string[];
  metricas: {
    puntualidad: number;
    calidad: number;
    precio: number;
    servicio: number;
  };
}

export interface ISeguimientoOrden {
  id_orden_compra: number;
  numeroOrden: string;
  proveedor: string;
  fechaEmision: Date;
  fechaEntregaEstimada?: Date;
  estado: string;
  diasTranscurridos: number;
  diasRestantes: number;
  alerta: 'VERDE' | 'AMARILLO' | 'ROJO';
  proxima_accion: string;
}

export interface ICompraInteligente {
  producto: string;
  cantidadRecomendada: number;
  proveedorRecomendado: string;
  precioEstimado: number;
  justificacion: string;
  urgencia: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  fechaSugerida: Date;
}

@Injectable()
export class ComprasAutomationService {
  private readonly logger = new Logger(ComprasAutomationService.name);
  private readonly reglasAutomatizacion: Map<
    string,
    IReglaAutomatizacionCompras
  > = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.inicializarReglasDefecto();
  }

  /**
   * Cron job que se ejecuta cada 2 horas para procesar automatizaciones de compras
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async procesarAutomatizacionesCompras() {
    this.logger.log(
      'Iniciando procesamiento de automatizaciones de compras...',
    );

    try {
      await Promise.all([
        this.procesarSeguimientoOrdenes(),
        this.procesarAlertasStock(),
        this.procesarEvaluacionProveedores(),
        this.procesarComprasInteligentes(),
        this.procesarAlertasPresupuesto(),
      ]);

      this.logger.log('Automatizaciones de compras procesadas exitosamente');
    } catch (error) {
      this.logger.error(
        `Error procesando automatizaciones de compras: ${error.message}`,
      );
    }
  }

  /**
   * Procesa seguimiento automático de órdenes de compra
   */
  async procesarSeguimientoOrdenes() {
    this.logger.log('Procesando seguimiento automático de órdenes...');

    const ordenesEnTransito = await this.prisma.ordenCompra.findMany({
      where: {
        estado: { in: ['aprobada', 'en_transito'] },
        fecha_emision: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Últimos 60 días
        },
      },
      include: {
        proveedor: true,
      },
    });

    for (const orden of ordenesEnTransito) {
      await this.evaluarSeguimientoOrden(orden);
    }
  }

  /**
   * Procesa alertas automáticas de stock bajo
   */
  async procesarAlertasStock() {
    this.logger.log('Procesando alertas de stock...');

    const productosStockBajo = await this.prisma.stock.findMany({
      where: {
        cantidad: {
          lte: 5, // Stock crítico
        },
      },
      include: {
        producto: {
          include: {
            categoria: true,
          },
        },
      },
    });

    for (const stock of productosStockBajo) {
      await this.procesarAlertaStock(stock);
    }
  }

  /**
   * Procesa evaluación automática de proveedores
   */
  async procesarEvaluacionProveedores() {
    this.logger.log('Procesando evaluación de proveedores...');

    const proveedores = await this.prisma.proveedor.findMany({
      where: { activo: true },
      include: {
        ordenes_compra: {
          where: {
            fecha_emision: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Últimos 90 días
            },
          },
        },
      },
    });

    for (const proveedor of proveedores) {
      await this.evaluarRendimientoProveedor(proveedor);
    }
  }

  /**
   * Procesa sugerencias de compras inteligentes
   */
  async procesarComprasInteligentes() {
    this.logger.log('Procesando compras inteligentes...');

    const empresasActivas = await this.prisma.empresa.findMany({
      where: { estado: 'activo' },
      select: { id_empresa: true },
    });

    for (const empresa of empresasActivas) {
      const sugerencias = await this.generarSugerenciasCompra(
        empresa.id_empresa,
      );

      if (sugerencias.length > 0) {
        await this.enviarSugerenciasCompra(empresa.id_empresa, sugerencias);
      }
    }
  }

  /**
   * Procesa alertas de presupuesto
   */
  async procesarAlertasPresupuesto() {
    this.logger.log('Procesando alertas de presupuesto...');

    const empresasActivas = await this.prisma.empresa.findMany({
      where: { estado: 'activo' },
      select: { id_empresa: true },
    });

    for (const empresa of empresasActivas) {
      await this.verificarPresupuestoMensual(empresa.id_empresa);
    }
  }

  /**
   * Gestiona automáticamente un proveedor
   */
  async gestionarProveedorAutomatico(
    empresaId: number,
    proveedorId: number,
  ): Promise<IGestionProveedor> {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: {
        id_proveedor: proveedorId,
        empresa_id: empresaId,
      },
      include: {
        ordenes_compra: {
          where: {
            fecha_emision: {
              gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Últimos 6 meses
            },
          },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Calcular métricas de rendimiento
    const ordenes = proveedor.ordenes_compra;
    const totalOrdenes = ordenes.length;

    if (totalOrdenes === 0) {
      return {
        id_proveedor: proveedorId,
        nombre: proveedor.nombre,
        estado: 'EVALUACION',
        score: 0,
        ultimaEvaluacion: new Date(),
        proximaEvaluacion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        alertas: ['Sin órdenes recientes para evaluar'],
        recomendaciones: ['Considerar realizar una orden de prueba'],
        metricas: {
          puntualidad: 0,
          calidad: 0,
          precio: 0,
          servicio: 0,
        },
      };
    }

    // Calcular puntualidad
    const ordenesRecibidas = ordenes.filter((o) => o.estado === 'RECIBIDA');
    const puntualidad = (ordenesRecibidas.length / totalOrdenes) * 100;

    // Calcular otras métricas (simplificado)
    const tiempoPromedioEntrega =
      ordenesRecibidas.length > 0
        ? ordenesRecibidas.reduce((sum, orden) => {
            const tiempoEntrega = orden.fecha_entrega
              ? Math.ceil(
                  (orden.fecha_entrega.getTime() -
                    orden.fecha_emision.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 15;
            return sum + tiempoEntrega;
          }, 0) / ordenesRecibidas.length
        : 15;

    const calidad = Math.min(
      100,
      100 - Math.max(0, (tiempoPromedioEntrega - 7) * 2),
    ); // Penalizar entregas tardías
    const montoPromedio =
      ordenes.reduce((sum, o) => sum + Number(o.total), 0) / totalOrdenes;
    const precio = Math.min(100, Math.max(50, 100 - montoPromedio / 10000)); // Scoring de precio
    const servicio = Math.min(100, puntualidad + Math.random() * 10 - 5); // Simular servicio

    const score =
      puntualidad * 0.3 + calidad * 0.25 + precio * 0.25 + servicio * 0.2;

    // Determinar estado y generar alertas/recomendaciones
    let estado: 'ACTIVO' | 'EVALUACION' | 'SUSPENDIDO' | 'INACTIVO';
    const alertas: string[] = [];
    const recomendaciones: string[] = [];

    if (score >= 80) {
      estado = 'ACTIVO';
      recomendaciones.push(
        'Proveedor confiable, considerar aumentar volumen de compras',
      );
    } else if (score >= 60) {
      estado = 'EVALUACION';
      alertas.push('Rendimiento por debajo del estándar');
      recomendaciones.push('Implementar plan de mejora con el proveedor');
    } else if (score >= 40) {
      estado = 'EVALUACION';
      alertas.push('Rendimiento deficiente, requiere atención inmediata');
      recomendaciones.push('Considerar proveedores alternativos');
    } else {
      estado = 'SUSPENDIDO';
      alertas.push('Rendimiento inaceptable');
      recomendaciones.push('Suspender compras y buscar reemplazo');
    }

    if (puntualidad < 70) {
      alertas.push('Problemas frecuentes de puntualidad en entregas');
    }

    if (tiempoPromedioEntrega > 14) {
      alertas.push('Tiempo de entrega superior al estándar');
    }

    return {
      id_proveedor: proveedorId,
      nombre: proveedor.nombre,
      estado,
      score,
      ultimaEvaluacion: new Date(),
      proximaEvaluacion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
      alertas,
      recomendaciones,
      metricas: {
        puntualidad,
        calidad,
        precio,
        servicio,
      },
    };
  }

  /**
   * Genera seguimiento inteligente de órdenes
   */
  async generarSeguimientoOrdenes(
    empresaId: number,
  ): Promise<ISeguimientoOrden[]> {
    const ordenes = await this.prisma.ordenCompra.findMany({
      where: {
        id_empresa: empresaId,
        estado: { in: ['APROBADA', 'EN_TRANSITO'] },
      },
      include: {
        proveedor: true,
      },
      orderBy: {
        fecha_emision: 'asc',
      },
    });

    return ordenes.map((orden) => {
      const hoy = new Date();
      const diasTranscurridos = Math.ceil(
        (hoy.getTime() - orden.fecha_emision.getTime()) / (1000 * 60 * 60 * 24),
      );

      const fechaEntregaEstimada =
        orden.fecha_entrega ||
        new Date(orden.fecha_emision.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 días por defecto

      const diasRestantes = Math.ceil(
        (fechaEntregaEstimada.getTime() - hoy.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      let alerta: 'VERDE' | 'AMARILLO' | 'ROJO';
      let proximaAccion: string;

      if (diasRestantes < 0) {
        alerta = 'ROJO';
        proximaAccion = 'Contactar proveedor urgentemente - Orden vencida';
      } else if (diasRestantes <= 2) {
        alerta = 'AMARILLO';
        proximaAccion = 'Confirmar status de entrega con proveedor';
      } else if (diasTranscurridos > 30) {
        alerta = 'ROJO';
        proximaAccion =
          'Orden antigua sin resolver - Revisar y cancelar si es necesario';
      } else {
        alerta = 'VERDE';
        proximaAccion = 'Seguimiento normal';
      }

      return {
        id_orden_compra: orden.id_orden_compra,
        numeroOrden: orden.numero_orden,
        proveedor: orden.proveedor.nombre,
        fechaEmision: orden.fecha_emision,
        fechaEntregaEstimada,
        estado: orden.estado,
        diasTranscurridos,
        diasRestantes,
        alerta,
        proxima_accion: proximaAccion,
      };
    });
  }

  // Métodos privados auxiliares

  private inicializarReglasDefecto() {
    // Regla: Alerta de stock bajo
    this.reglasAutomatizacion.set('alerta_stock_bajo', {
      id: 'alerta_stock_bajo',
      nombre: 'Alerta de Stock Bajo',
      descripcion:
        'Notifica cuando el stock de un producto llega al punto de reorden',
      condiciones: [
        {
          campo: 'cantidad_disponible',
          operador: 'menor',
          valor: 'punto_reorden',
          tipo: 'stock',
        },
      ],
      acciones: [
        {
          tipo: 'notificacion',
          parametros: {
            titulo: 'Stock bajo detectado',
            mensaje: 'El producto {{producto}} requiere reposición urgente',
          },
          prioridad: 'alta',
        },
        {
          tipo: 'orden_automatica',
          parametros: {
            cantidad_sugerida: 'cantidad_optima',
            proveedor_preferido: true,
          },
          prioridad: 'media',
        },
      ],
      activa: true,
      prioridad: 1,
    });

    // Regla: Seguimiento de entregas tardías
    this.reglasAutomatizacion.set('seguimiento_entregas', {
      id: 'seguimiento_entregas',
      nombre: 'Seguimiento de Entregas Tardías',
      descripcion: 'Seguimiento automático de órdenes con entregas retrasadas',
      condiciones: [
        {
          campo: 'fecha_entrega',
          operador: 'menor',
          valor: 'hoy',
          tipo: 'tiempo',
        },
        {
          campo: 'estado',
          operador: 'igual',
          valor: 'EN_TRANSITO',
          tipo: 'orden',
        },
      ],
      acciones: [
        {
          tipo: 'email',
          parametros: {
            destinatario: 'proveedor',
            asunto: 'Seguimiento de entrega - Orden {{numero_orden}}',
            plantilla: 'seguimiento_entrega',
          },
          prioridad: 'alta',
        },
      ],
      activa: true,
      prioridad: 2,
    });
  }

  private async evaluarSeguimientoOrden(orden: any) {
    const hoy = new Date();
    const diasTranscurridos = Math.ceil(
      (hoy.getTime() - orden.fecha_emision.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Notificar si la orden lleva mucho tiempo sin actualizarse
    if (diasTranscurridos > 15 && orden.estado === 'APROBADA') {
      await this.notificacionesService.create(orden.id_empresa, 0, {
        titulo: 'Orden de compra requiere seguimiento',
        contenido: `La orden ${orden.numero_orden} del proveedor ${orden.proveedor.nombre} lleva ${diasTranscurridos} días sin actualizaciones`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'seguimiento_orden',
          id_orden_compra: orden.id_orden_compra,
          dias_transcurridos: diasTranscurridos,
        }),
      });
    }

    // Notificar entregas tardías
    if (
      orden.fecha_entrega &&
      orden.fecha_entrega < hoy &&
      orden.estado === 'EN_TRANSITO'
    ) {
      const diasRetraso = Math.ceil(
        (hoy.getTime() - orden.fecha_entrega.getTime()) / (1000 * 60 * 60 * 24),
      );

      await this.notificacionesService.create(orden.id_empresa, 0, {
        titulo: 'Entrega retrasada detectada',
        contenido: `La orden ${orden.numero_orden} tiene ${diasRetraso} días de retraso en la entrega`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'entrega_retrasada',
          id_orden_compra: orden.id_orden_compra,
          dias_retraso: diasRetraso,
          proveedor: orden.proveedor.nombre,
        }),
      });
    }
  }

  private async procesarAlertaStock(stock: any) {
    const producto = stock.producto;
    if (!producto) return;

    // Obtener empresa del producto (simplificado)
    const empresaId = 1; // En un sistema real, obtener de la relación

    await this.notificacionesService.create(empresaId, 0, {
      titulo: 'Stock bajo detectado',
      contenido: `El producto "${producto.nombre}" tiene stock bajo (${stock.cantidad} unidades).`,
      tipo: TipoNotificacion.IN_APP,
      datosAdicionales: JSON.stringify({
        tipo: 'stock_bajo',
        id_producto: producto.id_producto,
        cantidad_actual: stock.cantidad,
      }),
    });
  }

  private async evaluarRendimientoProveedor(proveedor: any) {
    const ordenes = proveedor.ordenes_compra;

    if (ordenes.length === 0) return;

    // Calcular métricas básicas
    const ordenesRetrasadas = ordenes.filter(
      (o) =>
        o.fecha_entrega &&
        o.fecha_entrega < new Date() &&
        o.estado !== 'RECIBIDA',
    ).length;

    const tasaRetraso = (ordenesRetrasadas / ordenes.length) * 100;

    // Generar alerta si hay problemas de rendimiento
    if (tasaRetraso > 30) {
      // Más del 30% de retrasos
      await this.notificacionesService.create(proveedor.id_empresa, 0, {
        titulo: 'Proveedor con rendimiento deficiente',
        contenido: `El proveedor "${proveedor.nombre}" tiene una tasa de retraso del ${tasaRetraso.toFixed(1)}%`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'rendimiento_proveedor',
          id_proveedor: proveedor.id_proveedor,
          tasa_retraso: tasaRetraso,
          ordenes_evaluadas: ordenes.length,
        }),
      });
    }
  }

  private async generarSugerenciasCompra(
    empresaId: number,
  ): Promise<ICompraInteligente[]> {
    const sugerencias: ICompraInteligente[] = [];

    // Simplificado: obtener productos con stock bajo usando la estructura real del modelo
    const productosStockBajo = await this.prisma.stock.findMany({
      where: {
        cantidad: { lte: 5 }, // Stock bajo simple
      },
      include: {
        producto: true,
      },
    });

    for (const stock of productosStockBajo) {
      const producto = stock.producto;

      if (producto) {
        const cantidadRecomendada = Math.max(10, 20 - stock.cantidad);
        let urgencia: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

        if (stock.cantidad <= 0) urgencia = 'CRITICA';
        else if (stock.cantidad <= 2) urgencia = 'ALTA';
        else if (stock.cantidad <= 5) urgencia = 'MEDIA';
        else urgencia = 'BAJA';

        sugerencias.push({
          producto: producto.nombre,
          cantidadRecomendada,
          proveedorRecomendado: 'Proveedor Principal', // Simplificado
          precioEstimado: cantidadRecomendada * 100, // Precio estimado básico
          justificacion: `Stock actual: ${stock.cantidad} unidades. Requiere reposición urgente.`,
          urgencia,
          fechaSugerida: new Date(
            Date.now() +
              (urgencia === 'CRITICA' ? 1 : urgencia === 'ALTA' ? 3 : 7) *
                24 *
                60 *
                60 *
                1000,
          ),
        });
      }
    }

    return sugerencias.slice(0, 10); // Limitar a 10 sugerencias
  }

  private async enviarSugerenciasCompra(
    empresaId: number,
    sugerencias: ICompraInteligente[],
  ) {
    const sugerenciasUrgentes = sugerencias.filter(
      (s) => s.urgencia === 'CRITICA' || s.urgencia === 'ALTA',
    );

    if (sugerenciasUrgentes.length > 0) {
      const mensaje = `Se han identificado ${sugerenciasUrgentes.length} productos que requieren reposición urgente: ${sugerenciasUrgentes
        .map((s) => s.producto)
        .join(', ')}`;

      await this.notificacionesService.create(empresaId, 0, {
        titulo: 'Sugerencias de compra inteligente',
        contenido: mensaje,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'sugerencias_compra',
          cantidad_sugerencias: sugerencias.length,
          urgentes: sugerenciasUrgentes.length,
          sugerencias,
        }),
      });
    }
  }

  private async verificarPresupuestoMensual(empresaId: number) {
    const inicioMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const finMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    );

    const gastosMes = await this.prisma.ordenCompra.aggregate({
      where: {
        id_empresa: empresaId,
        fecha_emision: { gte: inicioMes, lte: finMes },
        estado: { in: ['APROBADA', 'EN_TRANSITO', 'RECIBIDA'] },
      },
      _sum: { total: true },
    });

    const gastoTotal = Number(gastosMes._sum.total) || 0;

    // Simular presupuesto mensual (en un sistema real vendría de configuración)
    const presupuestoMensual = 500000; // Valor simulado
    const porcentajeGastado = (gastoTotal / presupuestoMensual) * 100;

    if (porcentajeGastado > 80) {
      await this.notificacionesService.create(empresaId, 0, {
        titulo: 'Alerta de presupuesto',
        contenido: `Se ha gastado ${porcentajeGastado.toFixed(1)}% del presupuesto mensual (S/ ${gastoTotal.toLocaleString()})`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'alerta_presupuesto',
          gasto_actual: gastoTotal,
          presupuesto: presupuestoMensual,
          porcentaje_gastado: porcentajeGastado,
        }),
      });
    }
  }
}
