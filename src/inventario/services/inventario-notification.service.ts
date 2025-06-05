import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service';
import {
  CreateNotificacionDto,
  TipoNotificacion,
} from '../../notificaciones/dto/create-notificacion.dto';

export interface IConfiguracionAlerta {
  empresaId: number;
  stockMinimo: number;
  stockCritico: number;
  habilitarNotificaciones: boolean;
  canalesNotificacion: string[]; // ['app', 'email', 'whatsapp']
  frecuenciaRevisor: number; // minutos
  usuariosNotificar: number[]; // IDs de usuarios a notificar
}

export interface IAlertaStock {
  productoId: number;
  nombreProducto: string;
  cantidadActual: number;
  stockMinimo: number;
  tipoAlerta: 'STOCK_BAJO' | 'STOCK_CRITICO' | 'SIN_STOCK' | 'AGOTADO';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  categoria: string;
  precio: number;
  fechaDeteccion: Date;
}

@Injectable()
export class InventarioNotificationService {
  private readonly logger = new Logger(InventarioNotificationService.name);
  private readonly alertasEnProceso = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Configura las alertas de inventario para una empresa
   */
  async configurarAlertas(config: IConfiguracionAlerta): Promise<any> {
    try {
      // Guardar configuración en tabla de configuraciones (usar JSON en empresa)
      const configuracion = await this.prisma.empresa.update({
        where: { id_empresa: config.empresaId },
        data: {
          redes_sociales: {
            ...(await this.obtenerConfiguracionActual(config.empresaId)),
            configuracion_alertas_inventario: {
              stock_minimo: config.stockMinimo,
              stock_critico: config.stockCritico,
              habilitado: config.habilitarNotificaciones,
              canales: config.canalesNotificacion,
              frecuencia_minutos: config.frecuenciaRevisor,
              usuarios_notificar: config.usuariosNotificar,
              fecha_configuracion: new Date(),
            },
          },
        },
      });

      this.logger.log(
        `Configuración de alertas actualizada para empresa ${config.empresaId}`,
      );
      return configuracion;
    } catch (error) {
      this.logger.error(
        `Error al configurar alertas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Ejecuta revisión de inventario y genera alertas
   */
  async ejecutarRevisionInventario(empresaId: number): Promise<IAlertaStock[]> {
    const cacheKey = `revision_inventario_${empresaId}`;

    // Evitar ejecuciones duplicadas
    if (this.alertasEnProceso.has(cacheKey)) {
      this.logger.log(`Revisión ya en proceso para empresa ${empresaId}`);
      return [];
    }

    this.alertasEnProceso.add(cacheKey);

    try {
      const config = await this.obtenerConfiguracionAlertas(empresaId);
      if (!config?.habilitado) {
        this.logger.log(`Alertas deshabilitadas para empresa ${empresaId}`);
        return [];
      }

      // Obtener productos con stock bajo, crítico o agotado
      const alertas = await this.detectarAlertas(empresaId, config);

      // Procesar y enviar notificaciones
      if (alertas.length > 0) {
        await this.procesarAlertas(empresaId, alertas, config);
      }

      this.logger.log(
        `Revisión completada para empresa ${empresaId}: ${alertas.length} alertas detectadas`,
      );
      return alertas;
    } catch (error) {
      this.logger.error(
        `Error en revisión de inventario: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      this.alertasEnProceso.delete(cacheKey);
    }
  }

  /**
   * Detecta alertas de stock basado en los umbrales configurados
   */
  private async detectarAlertas(
    empresaId: number,
    config: any,
  ): Promise<IAlertaStock[]> {
    const productos = await this.prisma.productoServicio.findMany({
      where: {
        id_empresa: empresaId,
        es_servicio: false,
      },
      include: {
        stock: true,
        disponibilidad: true,
        categoria: { select: { nombre: true } },
      },
    });

    const alertas: IAlertaStock[] = [];

    for (const producto of productos) {
      if (!producto.stock) continue;

      const cantidadActual = producto.stock.cantidad;
      const cantidadDisponible =
        producto.disponibilidad?.cantidad_disponible || 0;
      const stockMinimo = config.stock_minimo || 10;
      const stockCritico = config.stock_critico || 5;

      let alerta: IAlertaStock | null = null;

      // Sin stock
      if (cantidadActual === 0) {
        alerta = {
          productoId: producto.id_producto,
          nombreProducto: producto.nombre,
          cantidadActual,
          stockMinimo,
          tipoAlerta: 'SIN_STOCK',
          prioridad: 'CRITICA',
          categoria: producto.categoria.nombre,
          precio: Number(producto.precio),
          fechaDeteccion: new Date(),
        };
      }
      // Producto agotado (sin disponibilidad)
      else if (cantidadDisponible === 0 && cantidadActual > 0) {
        alerta = {
          productoId: producto.id_producto,
          nombreProducto: producto.nombre,
          cantidadActual,
          stockMinimo,
          tipoAlerta: 'AGOTADO',
          prioridad: 'ALTA',
          categoria: producto.categoria.nombre,
          precio: Number(producto.precio),
          fechaDeteccion: new Date(),
        };
      }
      // Stock crítico
      else if (cantidadActual <= stockCritico) {
        alerta = {
          productoId: producto.id_producto,
          nombreProducto: producto.nombre,
          cantidadActual,
          stockMinimo,
          tipoAlerta: 'STOCK_CRITICO',
          prioridad: 'ALTA',
          categoria: producto.categoria.nombre,
          precio: Number(producto.precio),
          fechaDeteccion: new Date(),
        };
      }
      // Stock bajo
      else if (cantidadActual <= stockMinimo) {
        alerta = {
          productoId: producto.id_producto,
          nombreProducto: producto.nombre,
          cantidadActual,
          stockMinimo,
          tipoAlerta: 'STOCK_BAJO',
          prioridad: 'MEDIA',
          categoria: producto.categoria.nombre,
          precio: Number(producto.precio),
          fechaDeteccion: new Date(),
        };
      }

      if (alerta) {
        alertas.push(alerta);
      }
    }

    return alertas;
  }

  /**
   * Procesa y envía las alertas detectadas
   */
  private async procesarAlertas(
    empresaId: number,
    alertas: IAlertaStock[],
    config: any,
  ): Promise<void> {
    // Agrupar alertas por prioridad
    const alertasPorPrioridad = alertas.reduce(
      (acc, alerta) => {
        acc[alerta.prioridad] = acc[alerta.prioridad] || [];
        acc[alerta.prioridad].push(alerta);
        return acc;
      },
      {} as Record<string, IAlertaStock[]>,
    );

    // Crear notificación resumen
    const resumenNotificacion = this.generarMensajeResumen(alertas);

    // Obtener usuarios a notificar
    const usuariosNotificar = config.usuarios_notificar || [];
    const canales = config.canales || ['app'];

    // Enviar notificaciones críticas primero
    if (alertasPorPrioridad.CRITICA?.length > 0) {
      await this.enviarNotificacionCritica(
        empresaId,
        alertasPorPrioridad.CRITICA,
        usuariosNotificar,
        canales,
      );
    }

    // Enviar notificación resumen para el resto
    if (alertas.length > 0) {
      await this.enviarNotificacionResumen(
        empresaId,
        resumenNotificacion,
        usuariosNotificar,
        canales,
      );
    }

    // Registrar alertas en base de datos
    await this.registrarAlertas(empresaId, alertas);
  }

  /**
   * Envía notificación crítica inmediata
   */
  private async enviarNotificacionCritica(
    empresaId: number,
    alertasCriticas: IAlertaStock[],
    usuarios: number[],
    canales: string[],
  ): Promise<void> {
    const productos = alertasCriticas.map((a) => a.nombreProducto).join(', ');

    const notificacionDto: CreateNotificacionDto = {
      tipo: TipoNotificacion.IN_APP,
      titulo: '🚨 ALERTA CRÍTICA DE INVENTARIO',
      contenido: `Productos sin stock: ${productos}. Se han detectado ${alertasCriticas.length} productos con stock crítico o agotado que requieren atención inmediata.`,
      datosAdicionales: JSON.stringify({
        alertas: alertasCriticas,
        prioridad: 'CRITICA',
        requiere_accion: true,
      }),
    };

    // Enviar a usuarios específicos si están definidos
    if (usuarios.length > 0) {
      for (const usuarioId of usuarios) {
        try {
          // Buscar cliente asociado al usuario (necesario para el servicio actual)
          const cliente = await this.prisma.cliente.findFirst({
            where: { id_usuario: usuarioId },
          });

          if (cliente) {
            await this.notificacionesService.create(
              empresaId,
              cliente.id_cliente,
              notificacionDto,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error enviando notificación crítica a usuario ${usuarioId}: ${error.message}`,
          );
        }
      }
    } else {
      // Crear notificación general usando tabla directa
      await this.prisma.notificacion.create({
        data: {
          id_empresa: empresaId,
          tipo_notificacion: 'inventario_critico',
          titulo: notificacionDto.titulo,
          mensaje: notificacionDto.contenido,
          contenido: notificacionDto.contenido,
          datos_adicionales: JSON.parse(
            notificacionDto.datosAdicionales || '{}',
          ),
          canal: canales.join(','),
        },
      });
    }
  }

  /**
   * Envía notificación resumen de inventario
   */
  private async enviarNotificacionResumen(
    empresaId: number,
    resumen: string,
    usuarios: number[],
    canales: string[],
  ): Promise<void> {
    const notificacionDto: CreateNotificacionDto = {
      tipo: TipoNotificacion.IN_APP,
      titulo: '📊 Reporte de Inventario',
      contenido: resumen,
      datosAdicionales: JSON.stringify({
        tipo_reporte: 'resumen_inventario',
        fecha_generacion: new Date(),
      }),
    };

    // Crear notificación general
    await this.prisma.notificacion.create({
      data: {
        id_empresa: empresaId,
        tipo_notificacion: 'inventario_resumen',
        titulo: notificacionDto.titulo,
        mensaje: 'Resumen de alertas de inventario',
        contenido: notificacionDto.contenido,
        datos_adicionales: JSON.parse(notificacionDto.datosAdicionales || '{}'),
        canal: canales.join(','),
      },
    });
  }

  /**
   * Genera mensaje resumen de alertas
   */
  private generarMensajeResumen(alertas: IAlertaStock[]): string {
    const contadores = alertas.reduce(
      (acc, alerta) => {
        acc[alerta.tipoAlerta] = (acc[alerta.tipoAlerta] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    let mensaje = '📋 **Resumen de Alertas de Inventario**\n\n';

    if (contadores.SIN_STOCK) {
      mensaje += `🔴 **${contadores.SIN_STOCK}** productos sin stock\n`;
    }
    if (contadores.STOCK_CRITICO) {
      mensaje += `🟠 **${contadores.STOCK_CRITICO}** productos con stock crítico\n`;
    }
    if (contadores.AGOTADO) {
      mensaje += `🟡 **${contadores.AGOTADO}** productos agotados\n`;
    }
    if (contadores.STOCK_BAJO) {
      mensaje += `🟢 **${contadores.STOCK_BAJO}** productos con stock bajo\n`;
    }

    mensaje += '\n**Productos que requieren atención:**\n';

    alertas.slice(0, 10).forEach((alerta, index) => {
      const emoji =
        alerta.prioridad === 'CRITICA'
          ? '🚨'
          : alerta.prioridad === 'ALTA'
            ? '⚠️'
            : '⚡';
      mensaje += `${emoji} ${alerta.nombreProducto} (${alerta.cantidadActual} unidades)\n`;
    });

    if (alertas.length > 10) {
      mensaje += `\n... y ${alertas.length - 10} productos más.`;
    }

    return mensaje;
  }

  /**
   * Registra las alertas en la base de datos
   */
  private async registrarAlertas(
    empresaId: number,
    alertas: IAlertaStock[],
  ): Promise<void> {
    // Crear notificaciones persistentes para cada alerta crítica
    for (const alerta of alertas.filter((a) => a.prioridad === 'CRITICA')) {
      await this.prisma.notificacion.create({
        data: {
          id_empresa: empresaId,
          tipo_notificacion: 'alerta_inventario',
          titulo: `Alerta: ${alerta.nombreProducto}`,
          mensaje: `${alerta.tipoAlerta.replace('_', ' ')} - ${alerta.cantidadActual} unidades`,
          contenido: JSON.stringify(alerta),
          datos_adicionales: JSON.stringify(alerta),
          canal: 'app',
        },
      });
    }
  }

  /**
   * Obtiene la configuración actual de alertas
   */
  private async obtenerConfiguracionAlertas(empresaId: number): Promise<any> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
      select: { redes_sociales: true },
    });

    const config = empresa?.redes_sociales as any;
    return config?.configuracion_alertas_inventario || null;
  }

  /**
   * Obtiene la configuración actual de la empresa
   */
  private async obtenerConfiguracionActual(empresaId: number): Promise<any> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
      select: { redes_sociales: true },
    });

    return empresa?.redes_sociales || {};
  }

  /**
   * Obtiene el dashboard de alertas activas
   */
  async obtenerDashboardAlertas(empresaId: number): Promise<any> {
    const config = await this.obtenerConfiguracionAlertas(empresaId);

    if (!config?.habilitado) {
      return {
        alertasHabilitadas: false,
        mensaje: 'Las alertas de inventario están deshabilitadas',
      };
    }

    const alertas = await this.detectarAlertas(empresaId, config);

    const resumen = {
      total: alertas.length,
      criticas: alertas.filter((a) => a.prioridad === 'CRITICA').length,
      altas: alertas.filter((a) => a.prioridad === 'ALTA').length,
      medias: alertas.filter((a) => a.prioridad === 'MEDIA').length,
      bajas: alertas.filter((a) => a.prioridad === 'BAJA').length,
    };

    const alertasPorTipo = alertas.reduce(
      (acc, alerta) => {
        acc[alerta.tipoAlerta] = (acc[alerta.tipoAlerta] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      alertasHabilitadas: true,
      configuracion: config,
      resumen,
      alertasPorTipo,
      alertasRecientes: alertas.slice(0, 20),
      ultimaRevision: new Date(),
    };
  }

  /**
   * Programa revisiones automáticas (para usar con cron jobs)
   */
  async programarRevisionesAutomaticas(): Promise<void> {
    this.logger.log('Iniciando revisiones automáticas de inventario');

    try {
      // Obtener todas las empresas con alertas habilitadas
      const empresas = await this.prisma.empresa.findMany({
        select: {
          id_empresa: true,
          nombre: true,
          redes_sociales: true,
        },
      });

      for (const empresa of empresas) {
        const config = (empresa.redes_sociales as any)
          ?.configuracion_alertas_inventario;

        if (config?.habilitado) {
          try {
            await this.ejecutarRevisionInventario(empresa.id_empresa);
          } catch (error) {
            this.logger.error(
              `Error en revisión automática para empresa ${empresa.id_empresa}: ${error.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error en revisiones automáticas: ${error.message}`,
        error.stack,
      );
    }
  }
}
