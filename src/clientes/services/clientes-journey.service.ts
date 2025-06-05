import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service';
import { TipoNotificacion } from '../../notificaciones/dto/create-notificacion.dto';

// Interfaces para journey automation
export interface IWorkflowCliente {
  id: string;
  nombre: string;
  descripcion: string;
  triggers: ITriggerCliente[];
  acciones: IAccionCliente[];
  condiciones: ICondicionCliente[];
  activo: boolean;
  prioridad: number;
}

export interface ITriggerCliente {
  tipo:
    | 'REGISTRO'
    | 'PRIMERA_COMPRA'
    | 'TIEMPO_SIN_COMPRA'
    | 'VALOR_ALCANZADO'
    | 'ABANDONO_CARRITO'
    | 'CUMPLEANOS'
    | 'ANIVERSARIO';
  condicion: any;
  valor?: any;
}

export interface IAccionCliente {
  tipo:
    | 'EMAIL'
    | 'WHATSAPP'
    | 'NOTIFICACION'
    | 'DESCUENTO'
    | 'LLAMADA'
    | 'ASIGNAR_REPRESENTANTE';
  parametros: any;
  retraso?: number; // en horas
  prioridad?: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface ICondicionCliente {
  campo: string;
  operador: 'igual' | 'mayor' | 'menor' | 'contiene' | 'existe' | 'no_existe';
  valor: any;
}

export interface IClienteJourneyStatus {
  clienteId: number;
  etapaActual: string;
  fechaUltimaActividad: Date;
  workflowsActivos: string[];
  proximasAcciones: Array<{
    accion: string;
    fechaProgramada: Date;
    prioridad: string;
  }>;
  alertas: string[];
}

export interface ICampanaAutomatizada {
  id: string;
  nombre: string;
  objetivo:
    | 'RETENCION'
    | 'REACTIVACION'
    | 'UPSELLING'
    | 'CROSS_SELLING'
    | 'FIDELIZACION';
  segmentoObjetivo: any;
  mensaje: string;
  canal: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'LLAMADA';
  fechaInicio: Date;
  fechaFin?: Date;
  metricas: {
    enviados: number;
    abiertos: number;
    clicks: number;
    conversiones: number;
    roi: number;
  };
}

export interface IPersonalizacionCliente {
  clienteId: number;
  preferenciasContacto: {
    canalPreferido: string;
    horarioPreferido: string;
    frecuenciaContacto: string;
  };
  intereses: string[];
  comportamiento: {
    navegacion: any;
    compras: any;
    engagement: any;
  };
  contenidoPersonalizado: any;
}

@Injectable()
export class ClientesJourneyService {
  private readonly logger = new Logger(ClientesJourneyService.name);
  private readonly workflows: Map<string, IWorkflowCliente> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.inicializarWorkflowsDefecto();
  }

  /**
   * Cron job que se ejecuta cada 4 horas para procesar journeys automáticos
   */
  @Cron(CronExpression.EVERY_4_HOURS)
  async procesarJourneysAutomaticos() {
    this.logger.log(
      'Iniciando procesamiento de customer journeys automáticos...',
    );

    try {
      await Promise.all([
        this.procesarNuevosClientes(),
        this.procesarClientesInactivos(),
        this.procesarOportunidadesUpselling(),
        this.procesarClientesEnRiesgo(),
        this.procesarCampanasPersonalizadas(),
      ]);

      this.logger.log('Journeys automáticos procesados exitosamente');
    } catch (error) {
      this.logger.error(
        `Error procesando journeys automáticos: ${error.message}`,
      );
    }
  }

  /**
   * Cron job diario para envío de campañas programadas
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async procesarCampanasDiarias() {
    this.logger.log('Procesando campañas diarias programadas...');

    try {
      await this.enviarCampanasBienvenida();
      await this.enviarRecordatoriosFollowUp();
      await this.procesarCumpleanos();
      await this.enviarRecomendacionesPersonalizadas();
    } catch (error) {
      this.logger.error(`Error procesando campañas diarias: ${error.message}`);
    }
  }

  /**
   * Inicia un workflow específico para un cliente
   */
  async iniciarWorkflow(
    empresaId: number,
    clienteId: number,
    workflowId: string,
    contexto?: any,
  ) {
    this.logger.log(
      `Iniciando workflow ${workflowId} para cliente ${clienteId}`,
    );

    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.activo) {
      throw new Error(`Workflow ${workflowId} no encontrado o inactivo`);
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
      include: {
        historialCompras: true,
        consultas_whatsapp: true,
        valoraciones: true,
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar condiciones del workflow
    const condicionesCumplidas = this.evaluarCondiciones(
      workflow.condiciones,
      cliente,
      contexto,
    );
    if (!condicionesCumplidas) {
      this.logger.log(`Condiciones no cumplidas para workflow ${workflowId}`);
      return false;
    }

    // Ejecutar acciones del workflow
    for (const accion of workflow.acciones) {
      await this.ejecutarAccion(empresaId, clienteId, accion, cliente);
    }

    // Registrar ejecución del workflow
    await this.registrarEjecucionWorkflow(
      empresaId,
      clienteId,
      workflowId,
      contexto,
    );

    return true;
  }

  /**
   * Obtiene el estado del journey de un cliente
   */
  async obtenerEstadoJourney(
    empresaId: number,
    clienteId: number,
  ): Promise<IClienteJourneyStatus> {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
      include: {
        historialCompras: {
          orderBy: { fecha_compra: 'desc' },
          take: 1,
        },
        consultas_whatsapp: {
          orderBy: { fecha_consulta: 'desc' },
          take: 1,
        },
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Determinar etapa actual
    const etapaActual = this.determinarEtapaCliente(cliente);

    // Obtener fecha de última actividad
    const fechaUltimaActividad = this.obtenerFechaUltimaActividad(cliente);

    // Identificar workflows activos
    const workflowsActivos = await this.identificarWorkflowsActivos(cliente);

    // Generar próximas acciones
    const proximasAcciones = await this.generarProximasAcciones(
      cliente,
      etapaActual,
    );

    // Identificar alertas
    const alertas = this.identificarAlertas(cliente, fechaUltimaActividad);

    return {
      clienteId,
      etapaActual,
      fechaUltimaActividad,
      workflowsActivos,
      proximasAcciones,
      alertas,
    };
  }

  /**
   * Crea una campaña automatizada personalizada
   */
  async crearCampanaAutomatizada(
    empresaId: number,
    campana: Omit<ICampanaAutomatizada, 'id' | 'metricas'>,
  ): Promise<ICampanaAutomatizada> {
    const campanaCombien: ICampanaAutomatizada = {
      ...campana,
      id: `campana_${Date.now()}`,
      metricas: {
        enviados: 0,
        abiertos: 0,
        clicks: 0,
        conversiones: 0,
        roi: 0,
      },
    };

    // Obtener clientes del segmento objetivo
    const clientesObjetivo = await this.obtenerClientesSegmento(
      empresaId,
      campana.segmentoObjetivo,
    );

    // Programar envíos
    for (const cliente of clientesObjetivo) {
      await this.programarEnvioCampana(
        empresaId,
        cliente.id_cliente,
        campanaCombien,
      );
    }

    this.logger.log(
      `Campaña ${campanaCombien.id} creada para ${clientesObjetivo.length} clientes`,
    );

    return campanaCombien;
  }

  /**
   * Personaliza la experiencia para un cliente específico
   */
  async personalizarExperiencia(
    empresaId: number,
    clienteId: number,
  ): Promise<IPersonalizacionCliente> {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
      include: {
        historialCompras: {
          include: {
            producto: {
              include: {
                categoria: true,
              },
            },
          },
        },
        consultas_whatsapp: true,
        valoraciones: true,
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Analizar preferencias de contacto
    const preferenciasContacto = this.analizarPreferenciasContacto(cliente);

    // Identificar intereses basados en historial
    const intereses = this.identificarIntereses(cliente);

    // Analizar comportamiento
    const comportamiento = this.analizarComportamiento(cliente);

    // Generar contenido personalizado
    const contenidoPersonalizado = await this.generarContenidoPersonalizado(
      cliente,
      intereses,
    );

    return {
      clienteId,
      preferenciasContacto,
      intereses,
      comportamiento,
      contenidoPersonalizado,
    };
  }

  // Métodos privados para procesamiento automático

  private async procesarNuevosClientes() {
    this.logger.log('Procesando clientes nuevos...');

    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() - 24); // Últimas 24 horas

    const clientesNuevos = await this.prisma.cliente.findMany({
      where: {
        empresas: {
          some: {
            fecha_registro: {
              gte: fechaLimite,
            },
          },
        },
      },
      include: {
        empresas: true,
      },
    });

    for (const cliente of clientesNuevos) {
      for (const empresaCliente of cliente.empresas) {
        await this.iniciarWorkflow(
          empresaCliente.empresa_id,
          cliente.id_cliente,
          'bienvenida_nuevo_cliente',
        );
      }
    }
  }

  private async procesarClientesInactivos() {
    this.logger.log('Procesando clientes inactivos...');

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30); // 30 días sin actividad

    const clientesInactivos = await this.prisma.cliente.findMany({
      where: {
        historialCompras: {
          every: {
            fecha_compra: {
              lt: fechaLimite,
            },
          },
        },
      },
      include: {
        empresas: true,
        historialCompras: {
          orderBy: { fecha_compra: 'desc' },
          take: 1,
        },
      },
    });

    for (const cliente of clientesInactivos) {
      for (const empresaCliente of cliente.empresas) {
        await this.iniciarWorkflow(
          empresaCliente.empresa_id,
          cliente.id_cliente,
          'reactivacion_cliente_inactivo',
        );
      }
    }
  }

  private async procesarOportunidadesUpselling() {
    this.logger.log('Procesando oportunidades de upselling...');

    const clientesUpselling = await this.prisma.cliente.findMany({
      where: {
        historialCompras: {
          some: {
            fecha_compra: {
              gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Últimos 60 días
            },
          },
        },
      },
      include: {
        empresas: true,
        historialCompras: {
          include: {
            pagos: true,
            producto: {
              include: {
                categoria: true,
              },
            },
          },
        },
      },
    });

    for (const cliente of clientesUpselling) {
      const valorTotal = cliente.historialCompras.reduce((sum, compra) => {
        const valorCompra = compra.pagos.reduce(
          (sumPago, pago) => sumPago + Number(pago.monto),
          0,
        );
        return sum + valorCompra;
      }, 0);

      // Si el cliente tiene un buen historial, ofrecer productos premium
      if (valorTotal > 5000 && cliente.historialCompras.length >= 3) {
        for (const empresaCliente of cliente.empresas) {
          await this.iniciarWorkflow(
            empresaCliente.empresa_id,
            cliente.id_cliente,
            'oportunidad_upselling',
            {
              valorHistorico: valorTotal,
              categoriasCompradas: cliente.historialCompras.map(
                (c) => c.producto.categoria.nombre,
              ),
            },
          );
        }
      }
    }
  }

  private async procesarClientesEnRiesgo() {
    this.logger.log('Procesando clientes en riesgo de churn...');

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 90); // 90 días sin compra

    const clientesRiesgo = await this.prisma.cliente.findMany({
      where: {
        historialCompras: {
          some: {
            fecha_compra: {
              lt: fechaLimite,
            },
          },
          every: {
            fecha_compra: {
              lt: fechaLimite,
            },
          },
        },
      },
      include: {
        empresas: true,
        historialCompras: true,
      },
    });

    for (const cliente of clientesRiesgo) {
      // Solo procesar clientes que han comprado antes pero están inactivos
      if (cliente.historialCompras.length > 0) {
        for (const empresaCliente of cliente.empresas) {
          await this.iniciarWorkflow(
            empresaCliente.empresa_id,
            cliente.id_cliente,
            'retencion_cliente_riesgo',
          );
        }
      }
    }
  }

  private async procesarCampanasPersonalizadas() {
    this.logger.log('Procesando campañas personalizadas...');

    // Implementar lógica de campañas basadas en comportamiento
    // Por ejemplo: clientes que vieron productos pero no compraron

    const fechaReciente = new Date();
    fechaReciente.setDate(fechaReciente.getDate() - 7);

    const clientesConConsultas = await this.prisma.cliente.findMany({
      where: {
        consultas_whatsapp: {
          some: {
            fecha_consulta: {
              gte: fechaReciente,
            },
            estado: 'PENDIENTE',
          },
        },
      },
      include: {
        empresas: true,
        consultas_whatsapp: {
          where: {
            fecha_consulta: {
              gte: fechaReciente,
            },
          },
        },
        historialCompras: true,
      },
    });

    for (const cliente of clientesConConsultas) {
      // Si tienen consultas pero no han comprado recientemente
      const comprasRecientes = cliente.historialCompras.filter(
        (c) => c.fecha_compra >= fechaReciente,
      ).length;

      if (comprasRecientes === 0) {
        for (const empresaCliente of cliente.empresas) {
          await this.iniciarWorkflow(
            empresaCliente.empresa_id,
            cliente.id_cliente,
            'seguimiento_consulta_sin_compra',
          );
        }
      }
    }
  }

  private async enviarCampanasBienvenida() {
    // Enviar campañas de bienvenida programadas
    this.logger.log('Enviando campañas de bienvenida...');

    // Lógica para enviar emails/WhatsApp de bienvenida
    // basados en el tiempo desde el registro
  }

  private async enviarRecordatoriosFollowUp() {
    // Enviar recordatorios de seguimiento
    this.logger.log('Enviando recordatorios de seguimiento...');
  }

  private async procesarCumpleanos() {
    // Procesar clientes que cumplen años hoy
    this.logger.log('Procesando campañas de cumpleaños...');

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const diaActual = hoy.getDate();

    // Nota: Esto requeriría agregar fecha de nacimiento al modelo Cliente
    // Por ahora es un placeholder
  }

  private async enviarRecomendacionesPersonalizadas() {
    // Enviar recomendaciones basadas en historial
    this.logger.log('Enviando recomendaciones personalizadas...');
  }

  private async ejecutarAccion(
    empresaId: number,
    clienteId: number,
    accion: IAccionCliente,
    cliente: any,
  ) {
    this.logger.log(
      `Ejecutando acción ${accion.tipo} para cliente ${clienteId}`,
    );

    switch (accion.tipo) {
      case 'NOTIFICACION':
        await this.notificacionesService.create(empresaId, 0, {
          titulo: accion.parametros.titulo,
          contenido: accion.parametros.contenido,
          tipo: TipoNotificacion.IN_APP,
          datosAdicionales: JSON.stringify({
            tipo: 'workflow_automatico',
            clienteId,
            accion: accion.tipo,
          }),
        });
        break;

      case 'EMAIL':
        // Implementar envío de email
        this.logger.log(
          `Enviando email a ${cliente.email}: ${accion.parametros.asunto}`,
        );
        break;

      case 'WHATSAPP':
        // Implementar envío de WhatsApp
        this.logger.log(
          `Enviando WhatsApp a ${cliente.telefono}: ${accion.parametros.mensaje}`,
        );
        break;

      case 'DESCUENTO':
        // Crear descuento personalizado
        this.logger.log(
          `Creando descuento de ${accion.parametros.porcentaje}% para cliente ${clienteId}`,
        );
        break;

      case 'ASIGNAR_REPRESENTANTE':
        // Asignar representante de ventas
        this.logger.log(
          `Asignando representante ${accion.parametros.representanteId} a cliente ${clienteId}`,
        );
        break;
    }
  }

  private evaluarCondiciones(
    condiciones: ICondicionCliente[],
    cliente: any,
    contexto?: any,
  ): boolean {
    return condiciones.every((condicion) => {
      const valor = this.obtenerValorCampo(cliente, condicion.campo, contexto);
      return this.evaluarCondicion(valor, condicion.operador, condicion.valor);
    });
  }

  private obtenerValorCampo(cliente: any, campo: string, contexto?: any): any {
    const campos = campo.split('.');
    let valor = cliente;

    for (const c of campos) {
      valor = valor?.[c];
    }

    return valor !== undefined ? valor : contexto?.[campo];
  }

  private evaluarCondicion(
    valor: any,
    operador: string,
    valorEsperado: any,
  ): boolean {
    switch (operador) {
      case 'igual':
        return valor === valorEsperado;
      case 'mayor':
        return valor > valorEsperado;
      case 'menor':
        return valor < valorEsperado;
      case 'contiene':
        return String(valor).includes(valorEsperado);
      case 'existe':
        return valor !== undefined && valor !== null;
      case 'no_existe':
        return valor === undefined || valor === null;
      default:
        return false;
    }
  }

  private async registrarEjecucionWorkflow(
    empresaId: number,
    clienteId: number,
    workflowId: string,
    contexto?: any,
  ) {
    // Registrar en base de datos la ejecución del workflow
    // Esto ayuda a evitar duplicados y hacer seguimiento

    this.logger.log(
      `Workflow ${workflowId} ejecutado para cliente ${clienteId} en empresa ${empresaId}`,
    );
  }

  private determinarEtapaCliente(cliente: any): string {
    const hoy = new Date();
    const ultimaCompra = cliente.historialCompras[0]?.fecha_compra;
    const ultimaConsulta = cliente.consultas_whatsapp[0]?.fecha_consulta;

    if (!ultimaCompra && !ultimaConsulta) {
      return 'PROSPECTO';
    }

    if (!ultimaCompra && ultimaConsulta) {
      return 'INTERES';
    }

    if (ultimaCompra) {
      const diasSinComprar = Math.floor(
        (hoy.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasSinComprar <= 30) {
        return 'ACTIVO';
      } else if (diasSinComprar <= 90) {
        return 'TIBIO';
      } else {
        return 'INACTIVO';
      }
    }

    return 'EVALUACION';
  }

  private obtenerFechaUltimaActividad(cliente: any): Date {
    const fechas = [];

    if (cliente.historialCompras[0]) {
      fechas.push(cliente.historialCompras[0].fecha_compra);
    }

    if (cliente.consultas_whatsapp[0]) {
      fechas.push(cliente.consultas_whatsapp[0].fecha_consulta);
    }

    return fechas.length > 0
      ? new Date(Math.max(...fechas.map((f) => f.getTime())))
      : new Date(0);
  }

  private async identificarWorkflowsActivos(cliente: any): Promise<string[]> {
    // Identificar qué workflows están activos para este cliente
    const workflowsActivos = [];

    // Lógica para determinar workflows basada en estado del cliente
    const etapa = this.determinarEtapaCliente(cliente);

    switch (etapa) {
      case 'PROSPECTO':
        workflowsActivos.push('bienvenida_nuevo_cliente');
        break;
      case 'INACTIVO':
        workflowsActivos.push('reactivacion_cliente_inactivo');
        break;
      case 'ACTIVO':
        if (cliente.historialCompras.length >= 3) {
          workflowsActivos.push('oportunidad_upselling');
        }
        break;
    }

    return workflowsActivos;
  }

  private async generarProximasAcciones(cliente: any, etapaActual: string) {
    const acciones = [];
    const hoy = new Date();

    switch (etapaActual) {
      case 'PROSPECTO':
        acciones.push({
          accion: 'Enviar contenido de bienvenida',
          fechaProgramada: new Date(hoy.getTime() + 24 * 60 * 60 * 1000),
          prioridad: 'ALTA',
        });
        break;
      case 'INACTIVO':
        acciones.push({
          accion: 'Campaña de reactivación',
          fechaProgramada: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000),
          prioridad: 'ALTA',
        });
        break;
      case 'ACTIVO':
        acciones.push({
          accion: 'Encuesta de satisfacción',
          fechaProgramada: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000),
          prioridad: 'MEDIA',
        });
        break;
    }

    return acciones;
  }

  private identificarAlertas(
    cliente: any,
    fechaUltimaActividad: Date,
  ): string[] {
    const alertas = [];
    const hoy = new Date();
    const diasInactividad = Math.floor(
      (hoy.getTime() - fechaUltimaActividad.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasInactividad > 90) {
      alertas.push('Cliente en riesgo de churn - 90+ días sin actividad');
    }

    if (cliente.historialCompras.length === 0 && diasInactividad > 30) {
      alertas.push('Prospecto sin conversión después de 30 días');
    }

    if (
      cliente.consultas_whatsapp.length > 0 &&
      cliente.historialCompras.length === 0
    ) {
      alertas.push('Cliente con consultas pero sin compras');
    }

    return alertas;
  }

  private async obtenerClientesSegmento(
    empresaId: number,
    segmentoObjetivo: any,
  ) {
    // Obtener clientes que coincidan con el segmento objetivo
    return this.prisma.cliente.findMany({
      where: {
        empresas: {
          some: { empresa_id: empresaId },
        },
        // Agregar filtros basados en segmentoObjetivo
      },
    });
  }

  private async programarEnvioCampana(
    empresaId: number,
    clienteId: number,
    campana: ICampanaAutomatizada,
  ) {
    // Programar el envío de la campaña
    this.logger.log(
      `Programando campaña ${campana.id} para cliente ${clienteId}`,
    );
  }

  private analizarPreferenciasContacto(cliente: any) {
    // Analizar historial para determinar preferencias
    const whatsappCount = cliente.consultas_whatsapp.length;

    return {
      canalPreferido: whatsappCount > 0 ? 'WHATSAPP' : 'EMAIL',
      horarioPreferido: 'MANANA', // Se podría calcular basado en historial
      frecuenciaContacto: 'SEMANAL',
    };
  }

  private identificarIntereses(cliente: any): string[] {
    const intereses = new Set<string>();

    // Basado en productos comprados
    cliente.historialCompras.forEach((compra: any) => {
      if (compra.producto?.categoria?.nombre) {
        intereses.add(compra.producto.categoria.nombre);
      }
    });

    // Basado en consultas
    cliente.consultas_whatsapp.forEach((consulta: any) => {
      // Análisis básico de texto (se podría usar NLP)
      if (consulta.mensaje.toLowerCase().includes('precio')) {
        intereses.add('OFERTAS');
      }
      if (consulta.mensaje.toLowerCase().includes('producto')) {
        intereses.add('NUEVOS_PRODUCTOS');
      }
    });

    return Array.from(intereses);
  }

  private analizarComportamiento(cliente: any) {
    return {
      navegacion: {
        paginasVisitadas: [], // Se necesitaría tracking web
        tiempoPromedio: 0,
      },
      compras: {
        frecuencia: cliente.historialCompras.length,
        valorPromedio: cliente.historialCompras.length > 0 ? 1000 : 0, // Calcular real
        categoriasFavoritas: this.identificarIntereses(cliente),
      },
      engagement: {
        aperturaEmails: 0, // Se necesitaría tracking de emails
        clicksEnlaces: 0,
        respuestaWhatsApp: cliente.consultas_whatsapp.length,
      },
    };
  }

  private async generarContenidoPersonalizado(
    cliente: any,
    intereses: string[],
  ) {
    return {
      productosRecomendados: [], // Basado en intereses y historial
      ofertas: [], // Ofertas personalizadas
      contenidoEducativo: [], // Artículos/videos relevantes
      promocionesEspeciales: [], // Descuentos personalizados
    };
  }

  private inicializarWorkflowsDefecto() {
    // Workflow de bienvenida para nuevos clientes
    this.workflows.set('bienvenida_nuevo_cliente', {
      id: 'bienvenida_nuevo_cliente',
      nombre: 'Bienvenida a Nuevos Clientes',
      descripcion:
        'Serie de mensajes de bienvenida para clientes recién registrados',
      triggers: [
        {
          tipo: 'REGISTRO',
          condicion: 'nuevo_cliente',
        },
      ],
      acciones: [
        {
          tipo: 'EMAIL',
          parametros: {
            asunto: '¡Bienvenido a nuestra familia!',
            template: 'bienvenida',
          },
          retraso: 1, // 1 hora después del registro
        },
        {
          tipo: 'WHATSAPP',
          parametros: {
            mensaje:
              'Hola {nombre}, gracias por registrarte. ¿En qué podemos ayudarte?',
          },
          retraso: 24, // 24 horas después
        },
      ],
      condiciones: [],
      activo: true,
      prioridad: 1,
    });

    // Workflow de reactivación
    this.workflows.set('reactivacion_cliente_inactivo', {
      id: 'reactivacion_cliente_inactivo',
      nombre: 'Reactivación de Clientes Inactivos',
      descripcion:
        'Campaña para reactivar clientes que no han comprado en 30+ días',
      triggers: [
        {
          tipo: 'TIEMPO_SIN_COMPRA',
          condicion: 'dias_sin_compra',
          valor: 30,
        },
      ],
      acciones: [
        {
          tipo: 'EMAIL',
          parametros: {
            asunto: 'Te extrañamos {nombre}',
            template: 'reactivacion',
          },
        },
        {
          tipo: 'DESCUENTO',
          parametros: {
            porcentaje: 15,
            validezDias: 30,
          },
          retraso: 48,
        },
      ],
      condiciones: [
        {
          campo: 'historialCompras.length',
          operador: 'mayor',
          valor: 0,
        },
      ],
      activo: true,
      prioridad: 2,
    });

    // Workflow de upselling
    this.workflows.set('oportunidad_upselling', {
      id: 'oportunidad_upselling',
      nombre: 'Oportunidades de Upselling',
      descripcion: 'Ofertas de productos premium para clientes valiosos',
      triggers: [
        {
          tipo: 'VALOR_ALCANZADO',
          condicion: 'valor_total',
          valor: 5000,
        },
      ],
      acciones: [
        {
          tipo: 'NOTIFICACION',
          parametros: {
            titulo: 'Oferta Especial VIP',
            contenido: 'Productos premium con descuento exclusivo',
          },
        },
        {
          tipo: 'ASIGNAR_REPRESENTANTE',
          parametros: {
            representanteId: 1,
          },
        },
      ],
      condiciones: [
        {
          campo: 'historialCompras.length',
          operador: 'mayor',
          valor: 2,
        },
      ],
      activo: true,
      prioridad: 3,
    });

    // Workflow de retención
    this.workflows.set('retencion_cliente_riesgo', {
      id: 'retencion_cliente_riesgo',
      nombre: 'Retención de Clientes en Riesgo',
      descripcion: 'Campaña agresiva para retener clientes en riesgo de churn',
      triggers: [
        {
          tipo: 'TIEMPO_SIN_COMPRA',
          condicion: 'dias_sin_compra',
          valor: 90,
        },
      ],
      acciones: [
        {
          tipo: 'LLAMADA',
          parametros: {
            prioridad: 'ALTA',
            motivo: 'Retención',
          },
        },
        {
          tipo: 'DESCUENTO',
          parametros: {
            porcentaje: 25,
            validezDias: 15,
          },
        },
      ],
      condiciones: [
        {
          campo: 'historialCompras.length',
          operador: 'mayor',
          valor: 1,
        },
      ],
      activo: true,
      prioridad: 1,
    });

    // Workflow de seguimiento de consultas
    this.workflows.set('seguimiento_consulta_sin_compra', {
      id: 'seguimiento_consulta_sin_compra',
      nombre: 'Seguimiento de Consultas sin Compra',
      descripcion:
        'Seguimiento para clientes que consultaron pero no compraron',
      triggers: [
        {
          tipo: 'ABANDONO_CARRITO',
          condicion: 'consulta_sin_compra',
        },
      ],
      acciones: [
        {
          tipo: 'WHATSAPP',
          parametros: {
            mensaje:
              'Hola {nombre}, veo que consultaste sobre nuestros productos. ¿Puedo ayudarte con algo específico?',
          },
          retraso: 24,
        },
        {
          tipo: 'EMAIL',
          parametros: {
            asunto: 'Información adicional sobre tu consulta',
            template: 'seguimiento_consulta',
          },
          retraso: 72,
        },
      ],
      condiciones: [],
      activo: true,
      prioridad: 2,
    });

    this.logger.log(`${this.workflows.size} workflows inicializados`);
  }
}
