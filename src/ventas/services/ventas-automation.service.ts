import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service';
import { TipoNotificacion } from '../../notificaciones/dto/create-notificacion.dto';

// Interfaces para automatización de ventas
export interface IReglaAutomatizacion {
  id: string;
  nombre: string;
  descripcion: string;
  condiciones: ICondicionAutomatizacion[];
  acciones: IAccionAutomatizacion[];
  activa: boolean;
  prioridad: number;
}

export interface ICondicionAutomatizacion {
  campo: string;
  operador:
    | 'igual'
    | 'mayor'
    | 'menor'
    | 'contiene'
    | 'fecha_vencida'
    | 'no_actividad';
  valor: any;
  tipo: 'cotizacion' | 'cliente' | 'tiempo' | 'producto';
}

export interface IAccionAutomatizacion {
  tipo:
    | 'notificacion'
    | 'email'
    | 'whatsapp'
    | 'tarea'
    | 'cambio_estado'
    | 'seguimiento';
  parametros: any;
  destinatario?: string;
  prioridad?: 'alta' | 'media' | 'baja';
}

export interface IOportunidadComercial {
  id_cotizacion: number;
  id_cliente: number;
  empresaId: number;
  nombreCliente: string;
  estado: string;
  valor: number;
  probabilidad: number;
  fechaCreacion: Date;
  fechaEstimadaCierre: Date;
  diasSinActividad: number;
  proximaAccion: string;
  responsable?: string;
  notas?: string;
}

export interface ISeguimientoCotizacion {
  id_cotizacion: number;
  fechaEnvio: Date;
  fechaApertura?: Date;
  fechaRespuesta?: Date;
  numeroSeguimientos: number;
  ultimoSeguimiento?: Date;
  proximoSeguimiento?: Date;
  estado: 'pendiente' | 'abierta' | 'respondida' | 'vencida' | 'cerrada';
  canal: 'email' | 'whatsapp' | 'telefono' | 'presencial';
}

export interface IWorkflowVentas {
  id: string;
  nombre: string;
  pasos: IPasoWorkflow[];
  estado: 'activo' | 'pausado' | 'completado';
  documentoId: number;
  fechaInicio: Date;
  fechaEstimadaFin: Date;
}

export interface IPasoWorkflow {
  orden: number;
  nombre: string;
  descripcion: string;
  tipo: 'automatico' | 'manual' | 'aprobacion';
  dependencias: string[];
  accion: IAccionAutomatizacion;
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'omitido';
  fechaEjecucion?: Date;
}

@Injectable()
export class VentasAutomationService {
  private readonly logger = new Logger(VentasAutomationService.name);
  private readonly reglasAutomatizacion: Map<string, IReglaAutomatizacion> =
    new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.inicializarReglasDefecto();
  }

  /**
   * Cron job que se ejecuta cada hora para procesar automatizaciones
   */
  @Cron(CronExpression.EVERY_HOUR)
  async procesarAutomatizaciones() {
    this.logger.log('Iniciando procesamiento de automatizaciones de ventas...');

    try {
      await Promise.all([
        this.procesarSeguimientoCotizaciones(),
        this.procesarOportunidadesPerdidas(),
        this.procesarVencimientos(),
        this.procesarRecomendaciones(),
      ]);

      this.logger.log('Automatizaciones procesadas exitosamente');
    } catch (error) {
      this.logger.error(`Error procesando automatizaciones: ${error.message}`);
    }
  }

  /**
   * Gestiona el seguimiento automático de cotizaciones
   */
  async procesarSeguimientoCotizaciones() {
    const cotizacionesPendientes = await this.prisma.cotizacion.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ENVIADA'] },
        fecha_emision: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        },
      },
      include: {
        cliente: true,
        empresa: true,
      },
    });

    for (const cotizacion of cotizacionesPendientes) {
      await this.evaluarSeguimientoCotizacion(cotizacion);
    }
  }

  /**
   * Identifica y gestiona oportunidades que están en riesgo de perderse
   */
  async procesarOportunidadesPerdidas() {
    const oportunidadesRiesgo = await this.identificarOportunidadesEnRiesgo();

    for (const oportunidad of oportunidadesRiesgo) {
      await this.ejecutarAccionesRetencion(oportunidad);
    }
  }

  /**
   * Gestiona vencimientos de cotizaciones y documentos
   */
  async procesarVencimientos() {
    const hoy = new Date();
    const mañana = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Cotizaciones que vencen mañana
    const cotizacionesVencenMañana = await this.prisma.cotizacion.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ENVIADA'] },
        fecha_validez: {
          gte: hoy,
          lt: mañana,
        },
      },
      include: {
        cliente: true,
        empresa: true,
      },
    });

    for (const cotizacion of cotizacionesVencenMañana) {
      await this.notificarVencimientoProximo(cotizacion);
    }

    // Cotizaciones vencidas hoy
    const cotizacionesVencidas = await this.prisma.cotizacion.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ENVIADA'] },
        fecha_validez: {
          lt: hoy,
        },
      },
    });

    for (const cotizacion of cotizacionesVencidas) {
      await this.procesarCotizacionVencida(cotizacion);
    }
  }

  /**
   * Genera recomendaciones automáticas de seguimiento
   */
  async procesarRecomendaciones() {
    const empresas = await this.prisma.empresa.findMany({
      select: { id_empresa: true },
    });

    for (const empresa of empresas) {
      const recomendaciones = await this.generarRecomendacionesEmpresa(
        empresa.id_empresa,
      );
      if (recomendaciones.length > 0) {
        await this.enviarRecomendaciones(empresa.id_empresa, recomendaciones);
      }
    }
  }

  /**
   * Crea y gestiona workflows personalizados de ventas
   */
  async crearWorkflowVentas(
    empresaId: number,
    cotizacionId: number,
    tipoWorkflow:
      | 'seguimiento_basico'
      | 'seguimiento_intensivo'
      | 'reactivacion_cliente'
      | 'venta_cruzada',
  ): Promise<IWorkflowVentas> {
    const workflow: IWorkflowVentas = {
      id: `wf_${Date.now()}_${cotizacionId}`,
      nombre: this.obtenerNombreWorkflow(tipoWorkflow),
      pasos: this.generarPasosWorkflow(tipoWorkflow),
      estado: 'activo',
      documentoId: cotizacionId,
      fechaInicio: new Date(),
      fechaEstimadaFin: this.calcularFechaEstimadaFin(tipoWorkflow),
    };

    // Almacenar workflow en memoria/cache para ejecución
    await this.iniciarEjecucionWorkflow(empresaId, workflow);

    return workflow;
  }

  /**
   * Manejo de leads y oportunidades comerciales
   */
  async gestionarOportunidadComercial(
    empresaId: number,
    cotizacionId: number,
    probabilidad?: number,
    fechaEstimadaCierre?: Date,
  ): Promise<IOportunidadComercial> {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: {
        id_cotizacion: cotizacionId,
        id_empresa: empresaId,
      },
      include: {
        cliente: true,
      },
    });

    if (!cotizacion) {
      throw new Error('Cotización no encontrada');
    }

    const diasSinActividad = this.calcularDiasSinActividad(
      cotizacion.fecha_emision,
    );
    const probabilidadCalculada =
      probabilidad || this.calcularProbabilidad(cotizacion, diasSinActividad);

    const oportunidad: IOportunidadComercial = {
      id_cotizacion: cotizacionId,
      id_cliente: cotizacion.id_cliente,
      empresaId: empresaId,
      nombreCliente: cotizacion.cliente.nombre,
      estado: cotizacion.estado,
      valor: Number(cotizacion.total),
      probabilidad: probabilidadCalculada,
      fechaCreacion: cotizacion.fecha_emision,
      fechaEstimadaCierre:
        fechaEstimadaCierre || this.estimarFechaCierre(cotizacion),
      diasSinActividad,
      proximaAccion: this.determinarProximaAccion(
        diasSinActividad,
        cotizacion.estado,
      ),
    };

    // Crear tareas automáticas basadas en la oportunidad
    await this.crearTareasOportunidad(empresaId, oportunidad);

    return oportunidad;
  }

  /**
   * Sistema de scoring automático para leads
   */
  async calcularScoreLead(
    empresaId: number,
    clienteId: number,
  ): Promise<{
    score: number;
    factores: string[];
    recomendaciones: string[];
  }> {
    const [cliente, historicoCompras, cotizacionesRecientes] =
      await Promise.all([
        this.prisma.cliente.findFirst({
          where: { id_cliente: clienteId },
        }),
        this.obtenerHistoricoCompras(clienteId),
        this.obtenerCotizacionesRecientes(clienteId),
      ]);

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    let score = 0;
    const factores: string[] = [];

    // Factor 1: Historial de compras (40 puntos máximo)
    if (historicoCompras.totalCompras > 50000) {
      score += 40;
      factores.push('Cliente de alto valor (compras > $50,000)');
    } else if (historicoCompras.totalCompras > 20000) {
      score += 25;
      factores.push('Cliente de valor medio (compras > $20,000)');
    } else if (historicoCompras.totalCompras > 5000) {
      score += 15;
      factores.push('Cliente con historial de compras');
    }

    // Factor 2: Frecuencia de interacción (30 puntos máximo)
    if (cotizacionesRecientes.length > 5) {
      score += 30;
      factores.push('Alta frecuencia de solicitud de cotizaciones');
    } else if (cotizacionesRecientes.length > 2) {
      score += 20;
      factores.push('Frecuencia media de interacción');
    } else if (cotizacionesRecientes.length > 0) {
      score += 10;
      factores.push('Interacción reciente');
    }

    // Factor 3: Tasa de conversión (20 puntos máximo)
    const tasaConversion = this.calcularTasaConversion(clienteId);
    if (tasaConversion > 0.7) {
      score += 20;
      factores.push('Alta tasa de conversión (>70%)');
    } else if (tasaConversion > 0.4) {
      score += 15;
      factores.push('Tasa de conversión media');
    } else if (tasaConversion > 0.2) {
      score += 10;
      factores.push('Tasa de conversión baja pero activo');
    }

    // Factor 4: Tiempo como cliente (10 puntos máximo)
    const tiempoCliente = this.calcularTiempoComoCliente(new Date());
    if (tiempoCliente > 365) {
      score += 10;
      factores.push('Cliente de larga duración (>1 año)');
    } else if (tiempoCliente > 90) {
      score += 5;
      factores.push('Cliente establecido');
    }

    const recomendaciones = this.generarRecomendacionesScore(score);

    return {
      score: Math.min(score, 100), // Máximo 100 puntos
      factores,
      recomendaciones,
    };
  }

  // Métodos auxiliares privados

  private inicializarReglasDefecto() {
    // Regla: Seguimiento automático de cotizaciones
    this.reglasAutomatizacion.set('seguimiento_cotizaciones', {
      id: 'seguimiento_cotizaciones',
      nombre: 'Seguimiento Automático de Cotizaciones',
      descripcion:
        'Envía recordatorios automáticos para cotizaciones pendientes',
      condiciones: [
        {
          campo: 'estado',
          operador: 'igual',
          valor: 'PENDIENTE',
          tipo: 'cotizacion',
        },
        {
          campo: 'dias_sin_respuesta',
          operador: 'mayor',
          valor: 3,
          tipo: 'tiempo',
        },
      ],
      acciones: [
        {
          tipo: 'notificacion',
          parametros: {
            titulo: 'Seguimiento de cotización requerido',
            mensaje:
              'La cotización {{numero}} lleva {{dias}} días sin respuesta',
          },
          prioridad: 'media',
        },
      ],
      activa: true,
      prioridad: 1,
    });

    // Regla: Alerta de vencimiento
    this.reglasAutomatizacion.set('alerta_vencimiento', {
      id: 'alerta_vencimiento',
      nombre: 'Alerta de Vencimiento de Cotizaciones',
      descripcion: 'Notifica cuando una cotización está por vencer',
      condiciones: [
        {
          campo: 'fecha_validez',
          operador: 'menor',
          valor: 2, // 2 días antes del vencimiento
          tipo: 'tiempo',
        },
      ],
      acciones: [
        {
          tipo: 'email',
          parametros: {
            asunto: 'Cotización próxima a vencer',
            plantilla: 'vencimiento_cotizacion',
          },
          prioridad: 'alta',
        },
      ],
      activa: true,
      prioridad: 2,
    });
  }

  private async evaluarSeguimientoCotizacion(cotizacion: any) {
    const diasSinActividad = this.calcularDiasSinActividad(
      cotizacion.fecha_emision,
    );

    if (diasSinActividad >= 3 && diasSinActividad <= 7) {
      // Primer seguimiento
      await this.enviarSeguimientoAutomatico(cotizacion, 'primer_seguimiento');
    } else if (diasSinActividad >= 7 && diasSinActividad <= 14) {
      // Segundo seguimiento
      await this.enviarSeguimientoAutomatico(cotizacion, 'segundo_seguimiento');
    } else if (diasSinActividad > 14) {
      // Último intento antes de marcar como perdida
      await this.enviarSeguimientoAutomatico(cotizacion, 'ultimo_seguimiento');
    }
  }

  private async identificarOportunidadesEnRiesgo(): Promise<
    IOportunidadComercial[]
  > {
    const cotizacionesRiesgo = await this.prisma.cotizacion.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ENVIADA'] },
        fecha_emision: {
          lt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Más de 10 días
        },
      },
      include: {
        cliente: true,
      },
    });

    return cotizacionesRiesgo.map((cotizacion) => ({
      id_cotizacion: cotizacion.id_cotizacion,
      id_cliente: cotizacion.id_cliente,
      empresaId: cotizacion.id_empresa,
      nombreCliente: cotizacion.cliente.nombre,
      estado: cotizacion.estado,
      valor: Number(cotizacion.total),
      probabilidad: this.calcularProbabilidad(
        cotizacion,
        this.calcularDiasSinActividad(cotizacion.fecha_emision),
      ),
      fechaCreacion: cotizacion.fecha_emision,
      fechaEstimadaCierre: this.estimarFechaCierre(cotizacion),
      diasSinActividad: this.calcularDiasSinActividad(cotizacion.fecha_emision),
      proximaAccion: 'Contacto urgente de retención',
    }));
  }

  private async ejecutarAccionesRetencion(oportunidad: IOportunidadComercial) {
    // Crear notificación para el equipo de ventas
    await this.notificacionesService.create(oportunidad.empresaId, 0, {
      titulo: 'Oportunidad en riesgo',
      contenido: `La oportunidad con ${oportunidad.nombreCliente} (valor: $${oportunidad.valor}) necesita atención urgente`,
      tipo: TipoNotificacion.IN_APP,
      datosAdicionales: JSON.stringify({
        tipo: 'oportunidad_riesgo',
        id_cotizacion: oportunidad.id_cotizacion,
        probabilidad: oportunidad.probabilidad,
      }),
    });
  }

  private async notificarVencimientoProximo(cotizacion: any) {
    await this.notificacionesService.create(
      cotizacion.id_empresa,
      cotizacion.id_cliente,
      {
        titulo: 'Cotización próxima a vencer',
        contenido: `La cotización para ${cotizacion.cliente.nombre} vence mañana`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'vencimiento_proximo',
          id_cotizacion: cotizacion.id_cotizacion,
          fecha_vencimiento: cotizacion.fecha_validez,
        }),
      },
    );
  }

  private async procesarCotizacionVencida(cotizacion: any) {
    // Actualizar estado a vencida
    await this.prisma.cotizacion.update({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      data: { estado: 'VENCIDA' },
    });

    // Crear notificación
    await this.notificacionesService.create(
      cotizacion.id_empresa,
      cotizacion.id_cliente,
      {
        titulo: 'Cotización vencida',
        contenido: `La cotización ${cotizacion.id_cotizacion} ha vencido sin respuesta`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'cotizacion_vencida',
          id_cotizacion: cotizacion.id_cotizacion,
        }),
      },
    );
  }

  private async generarRecomendacionesEmpresa(
    empresaId: number,
  ): Promise<string[]> {
    const recomendaciones: string[] = [];

    // Analizar patrones y generar recomendaciones
    const cotizacionesPendientes = await this.prisma.cotizacion.count({
      where: {
        id_empresa: empresaId,
        estado: 'PENDIENTE',
      },
    });

    if (cotizacionesPendientes > 10) {
      recomendaciones.push(
        'Considere aumentar la frecuencia de seguimiento de cotizaciones',
      );
    }

    return recomendaciones;
  }

  private async enviarRecomendaciones(
    empresaId: number,
    recomendaciones: string[],
  ) {
    for (const recomendacion of recomendaciones) {
      await this.notificacionesService.create(empresaId, 0, {
        titulo: 'Recomendación de ventas',
        contenido: recomendacion,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'recomendacion_automatica',
        }),
      });
    }
  }

  private obtenerNombreWorkflow(tipo: string): string {
    switch (tipo) {
      case 'seguimiento_basico':
        return 'Seguimiento Básico de Cotización';
      case 'seguimiento_intensivo':
        return 'Seguimiento Intensivo de Oportunidad';
      case 'reactivacion_cliente':
        return 'Reactivación de Cliente Inactivo';
      case 'venta_cruzada':
        return 'Venta Cruzada y Upselling';
      default:
        return 'Workflow Personalizado';
    }
  }

  private generarPasosWorkflow(tipo: string): IPasoWorkflow[] {
    // Implementación simplificada - en producción sería más complejo
    return [
      {
        orden: 1,
        nombre: 'Contacto inicial',
        descripcion: 'Primer contacto con el cliente',
        tipo: 'automatico',
        dependencias: [],
        accion: { tipo: 'email', parametros: {} },
        estado: 'pendiente',
      },
    ];
  }

  private calcularFechaEstimadaFin(tipo: string): Date {
    const dias = tipo === 'seguimiento_intensivo' ? 14 : 7;
    return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  }

  private async iniciarEjecucionWorkflow(
    empresaId: number,
    workflow: IWorkflowVentas,
  ) {
    // Implementación de ejecución de workflow
    this.logger.log(
      `Iniciando workflow ${workflow.nombre} para empresa ${empresaId}`,
    );
  }

  private calcularDiasSinActividad(fechaCreacion: Date): number {
    return Math.floor(
      (Date.now() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private calcularProbabilidad(
    cotizacion: any,
    diasSinActividad: number,
  ): number {
    let probabilidad = 50; // Base 50%

    // Reducir probabilidad por días sin actividad
    probabilidad -= diasSinActividad * 2;

    // Ajustar por valor de la cotización
    const valor = Number(cotizacion.total);
    if (valor > 50000) probabilidad += 20;
    else if (valor > 20000) probabilidad += 10;

    return Math.max(0, Math.min(100, probabilidad));
  }

  private estimarFechaCierre(cotizacion: any): Date {
    const dias = cotizacion.estado === 'ENVIADA' ? 7 : 14;
    return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  }

  private determinarProximaAccion(
    diasSinActividad: number,
    estado: string,
  ): string {
    if (diasSinActividad < 3) return 'Esperar respuesta';
    if (diasSinActividad < 7) return 'Primer seguimiento';
    if (diasSinActividad < 14) return 'Contacto telefónico';
    return 'Reunión presencial o descarte';
  }

  private async crearTareasOportunidad(
    empresaId: number,
    oportunidad: IOportunidadComercial,
  ) {
    // Crear tareas automáticas basadas en el estado de la oportunidad
    if (oportunidad.diasSinActividad > 7) {
      await this.notificacionesService.create(
        empresaId,
        oportunidad.id_cliente,
        {
          titulo: 'Tarea: Seguimiento de oportunidad',
          contenido: `Realizar seguimiento a ${oportunidad.nombreCliente}`,
          tipo: TipoNotificacion.IN_APP,
          datosAdicionales: JSON.stringify({
            tipo: 'tarea_seguimiento',
            id_cotizacion: oportunidad.id_cotizacion,
            accion: oportunidad.proximaAccion,
          }),
        },
      );
    }
  }

  private async obtenerHistoricoCompras(
    clienteId: number,
  ): Promise<{ totalCompras: number }> {
    const result = await this.prisma.factura.aggregate({
      where: {
        orden_venta: {
          id_cliente: clienteId,
        },
        estado: 'EMITIDA',
      },
      _sum: {
        total: true,
      },
    });

    return {
      totalCompras: Number(result._sum.total || 0),
    };
  }

  private async obtenerCotizacionesRecientes(clienteId: number) {
    const fechaLimite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Últimos 90 días

    return this.prisma.cotizacion.findMany({
      where: {
        id_cliente: clienteId,
        fecha_emision: {
          gte: fechaLimite,
        },
      },
    });
  }

  private calcularTasaConversion(clienteId: number): number {
    // Implementación simplificada - en producción se calcularía con datos reales
    return 0.65; // 65% de tasa de conversión promedio
  }

  private calcularTiempoComoCliente(fechaCreacion: Date): number {
    return Math.floor(
      (Date.now() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private generarRecomendacionesScore(score: number): string[] {
    if (score >= 80) {
      return [
        'Cliente de alta prioridad - contacto inmediato',
        'Ofrecer productos premium o servicios adicionales',
        'Asignar ejecutivo comercial dedicado',
      ];
    } else if (score >= 50) {
      return [
        'Cliente con potencial - seguimiento regular',
        'Enviar información de productos relacionados',
        'Programar llamada de seguimiento',
      ];
    } else {
      return [
        'Cliente de seguimiento básico',
        'Incluir en campañas de marketing general',
        'Monitorear actividad para futuras oportunidades',
      ];
    }
  }

  private async enviarSeguimientoAutomatico(cotizacion: any, tipo: string) {
    const mensajes = {
      primer_seguimiento: 'Esperamos su respuesta a nuestra cotización',
      segundo_seguimiento: 'Recordatorio sobre cotización pendiente',
      ultimo_seguimiento: 'Última oportunidad para esta oferta especial',
    };

    await this.notificacionesService.create(
      cotizacion.id_empresa,
      cotizacion.id_cliente,
      {
        titulo: 'Seguimiento automático enviado',
        contenido: `Se envió ${tipo} a ${cotizacion.cliente.nombre}`,
        tipo: TipoNotificacion.IN_APP,
        datosAdicionales: JSON.stringify({
          tipo: 'seguimiento_automatico',
          id_cotizacion: cotizacion.id_cotizacion,
          canal: 'email',
        }),
      },
    );
  }
}
