import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFidelizacionDto } from '../dto/create-fidelizacion.dto';
import { UpdatePuntosFidelizacionDto } from '../dto/update-puntos-fidelizacion.dto';
import {
  BaseFidelizacionService,
  FidelizacionFormatted,
  PaginatedFidelizaciones,
  MovimientoPuntos,
} from './base-fidelizacion.service';
import {
  FidelizacionValidationService,
  FidelizacionFilters,
} from './fidelizacion-validation.service';
import {
  FidelizacionCalculationService,
  MetricasFidelizacion,
  DashboardFidelizacion,
} from './fidelizacion-calculation.service';

@Injectable()
export class FidelizacionService extends BaseFidelizacionService {
  protected readonly logger = new Logger(FidelizacionService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: FidelizacionValidationService,
    protected readonly calculationService: FidelizacionCalculationService,
  ) {
    super(prisma, validationService, calculationService);
  }

  /**
   * Crear nueva fidelización para un cliente
   */
  async create(
    createFidelizacionDto: CreateFidelizacionDto,
    empresaId: number,
  ): Promise<FidelizacionFormatted> {
    return await this.createFidelizacion(createFidelizacionDto, empresaId);
  }

  /**
   * Obtener todas las fidelizaciones de una empresa con paginación y filtros
   */
  async findAll(
    empresaId: number,
    page: number = 1,
    limit: number = 10,
    filters: FidelizacionFilters = {},
  ): Promise<PaginatedFidelizaciones> {
    return await this.getFidelizaciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener fidelización específica por cliente
   */
  async findByCliente(
    clienteId: number,
    empresaId: number,
  ): Promise<FidelizacionFormatted> {
    this.logger.log(`Buscando fidelización para cliente ${clienteId}`);

    await this.validationService.validateClienteEmpresa(clienteId, empresaId);
    const fidelizacion =
      await this.validationService.validateFidelizacionExists(clienteId);

    return await this.formatFidelizacionResponse(
      fidelizacion.id_fidelizacion,
      empresaId,
    );
  }

  /**
   * Actualizar puntos de fidelización
   */
  async updatePuntos(
    clienteId: number,
    updatePuntosFidelizacionDto: UpdatePuntosFidelizacionDto,
    empresaId: number,
  ): Promise<FidelizacionFormatted> {
    return await this.updatePuntosFidelizacion(
      clienteId,
      updatePuntosFidelizacionDto,
      empresaId,
    );
  }

  /**
   * Eliminar fidelización de un cliente
   */
  async remove(clienteId: number, empresaId: number): Promise<void> {
    return await this.deleteFidelizacion(clienteId, empresaId);
  }

  /**
   * Agregar puntos por compra realizada
   */
  async addPointsForPurchase(
    clienteId: number,
    montoCompra: number,
    empresaId: number,
    ordenVentaId?: number,
  ): Promise<MovimientoPuntos> {
    return await this.agregarPuntosPorCompra(
      clienteId,
      montoCompra,
      empresaId,
      ordenVentaId,
    );
  }

  /**
   * Canjear puntos por beneficios
   */
  async redeemPoints(
    clienteId: number,
    puntosACanjear: number,
    descripcionCanje: string,
    empresaId: number,
  ): Promise<MovimientoPuntos> {
    return await this.canjearPuntos(
      clienteId,
      puntosACanjear,
      descripcionCanje,
      empresaId,
    );
  }

  /**
   * Buscar fidelizaciones por múltiples criterios
   */
  async searchFidelizaciones(
    empresaId: number,
    searchParams: {
      nombreCliente?: string;
      emailCliente?: string;
      nivel?: string;
      puntosMinimos?: number;
      puntosMaximos?: number;
      fechaInicio?: Date;
      fechaFin?: Date;
      activo?: boolean;
    },
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedFidelizaciones> {
    this.logger.log(
      `Buscando fidelizaciones con criterios: ${JSON.stringify(searchParams)}`,
    );

    // Validar parámetros de búsqueda
    this.validationService.validateSearchParams(searchParams);

    // Construir filtros avanzados
    const filters = await this.buildAdvancedFilters(empresaId, searchParams);

    return await this.getFidelizaciones(empresaId, page, limit, filters);
  }

  /**
   * Obtener métricas generales de fidelización
   */
  async getMetricas(empresaId: number): Promise<MetricasFidelizacion> {
    this.logger.log(
      `Calculando métricas de fidelización para empresa ${empresaId}`,
    );
    return await this.calculationService.calculateMetricasFidelizacion(
      empresaId,
    );
  }

  /**
   * Obtener dashboard completo de fidelización
   */
  async getDashboard(empresaId: number): Promise<DashboardFidelizacion> {
    this.logger.log(
      `Generando dashboard de fidelización para empresa ${empresaId}`,
    );
    return await this.calculationService.generateDashboard(empresaId);
  }

  /**
   * Verificar si un cliente puede participar en el programa de fidelización
   */
  async checkEligibility(
    clienteId: number,
    empresaId: number,
  ): Promise<{
    elegible: boolean;
    razon?: string;
    requisitos_faltantes?: string[];
    puede_inscribirse: boolean;
  }> {
    this.logger.log(
      `Verificando elegibilidad de cliente ${clienteId} para fidelización`,
    );

    try {
      await this.validationService.validateClienteEmpresa(clienteId, empresaId);

      // Verificar si ya tiene fidelización activa
      const fidelizacionExistente = await this.prisma.fidelizacion.findFirst({
        where: { id_cliente: clienteId },
      });

      if (fidelizacionExistente) {
        const esActiva =
          !fidelizacionExistente.fecha_fin ||
          fidelizacionExistente.fecha_fin > new Date();

        return {
          elegible: esActiva,
          razon: esActiva
            ? 'Cliente ya inscrito en programa'
            : 'Programa expirado',
          puede_inscribirse: !esActiva,
        };
      }

      // Verificar requisitos mínimos
      const cliente = await this.prisma.cliente.findUnique({
        where: { id_cliente: clienteId },
      });

      const requisitosFaltantes: string[] = [];

      if (!cliente) {
        return {
          elegible: false,
          razon: 'Cliente no encontrado',
          puede_inscribirse: false,
        };
      }

      if (!cliente.email) {
        requisitosFaltantes.push('Email válido');
      }

      if (!cliente.telefono) {
        requisitosFaltantes.push('Número de teléfono');
      }

      // Verificar al menos una compra en los últimos 6 meses
      const seiseMesesAtras = new Date();
      seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

      const comprasRecientes = await this.prisma.ordenVenta.count({
        where: {
          id_cliente: clienteId,
          fecha_entrega: { gte: seiseMesesAtras },
        },
      });

      if (comprasRecientes === 0) {
        requisitosFaltantes.push('Al menos una compra en los últimos 6 meses');
      }

      return {
        elegible: requisitosFaltantes.length === 0,
        requisitos_faltantes:
          requisitosFaltantes.length > 0 ? requisitosFaltantes : undefined,
        puede_inscribirse: requisitosFaltantes.length === 0,
      };
    } catch (error) {
      return {
        elegible: false,
        razon: 'Cliente no encontrado o no pertenece a la empresa',
        puede_inscribirse: false,
      };
    }
  }

  /**
   * Obtener historial de movimientos de puntos
   */
  async getHistorialPuntos(
    clienteId: number,
    empresaId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    movimientos: MovimientoPuntos[];
    meta: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
    resumen: {
      total_ganados: number;
      total_canjeados: number;
      saldo_actual: number;
    };
  }> {
    this.logger.log(`Obteniendo historial de puntos para cliente ${clienteId}`);

    await this.validationService.validateClienteEmpresa(clienteId, empresaId);
    const fidelizacion =
      await this.validationService.validateFidelizacionExists(clienteId);

    // Por ahora simulamos el historial ya que no tenemos tabla de movimientos
    // En una implementación real, esto vendría de una tabla de movimientos
    const movimientos: MovimientoPuntos[] = [
      {
        tipo: 'GANADO',
        puntos: 150,
        descripcion: 'Puntos por compra de S/. 150.00',
        fecha: new Date('2024-01-15'),
        referencia: 'VENTA-001',
      },
      {
        tipo: 'CANJEADO',
        puntos: 50,
        descripcion: 'Canje por descuento 5%',
        fecha: new Date('2024-01-20'),
      },
    ];

    const total = movimientos.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMovimientos = movimientos.slice(startIndex, endIndex);

    const totalGanados = movimientos
      .filter((m) => m.tipo === 'GANADO')
      .reduce((sum, m) => sum + m.puntos, 0);

    const totalCanjeados = movimientos
      .filter((m) => m.tipo === 'CANJEADO')
      .reduce((sum, m) => sum + m.puntos, 0);

    return {
      movimientos: paginatedMovimientos,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      resumen: {
        total_ganados: totalGanados,
        total_canjeados: totalCanjeados,
        saldo_actual: fidelizacion.puntos_actuales,
      },
    };
  }

  /**
   * Procesar múltiples operaciones de puntos en lote
   */
  async processBatchOperations(
    empresaId: number,
    operations: Array<{
      clienteId: number;
      tipo: 'AGREGAR' | 'CANJEAR' | 'AJUSTAR';
      puntos: number;
      descripcion: string;
      referencia?: string;
    }>,
  ): Promise<{
    exitosas: number;
    fallidas: number;
    resultados: Array<{
      clienteId: number;
      exito: boolean;
      mensaje: string;
      movimiento?: MovimientoPuntos;
    }>;
  }> {
    this.logger.log(`Procesando ${operations.length} operaciones en lote`);

    const resultados: Array<{
      clienteId: number;
      exito: boolean;
      mensaje: string;
      movimiento?: MovimientoPuntos;
    }> = [];
    let exitosas = 0;
    let fallidas = 0;

    for (const operation of operations) {
      try {
        let movimiento: MovimientoPuntos;

        switch (operation.tipo) {
          case 'AGREGAR':
            movimiento = await this.agregarPuntosPorCompra(
              operation.clienteId,
              operation.puntos,
              empresaId,
            );
            break;

          case 'CANJEAR':
            movimiento = await this.canjearPuntos(
              operation.clienteId,
              operation.puntos,
              operation.descripcion,
              empresaId,
            );
            break;

          case 'AJUSTAR':
            // Implementar ajuste manual de puntos
            const fidelizacion =
              await this.validationService.validateFidelizacionExists(
                operation.clienteId,
              );

            await this.prisma.fidelizacion.update({
              where: { id_fidelizacion: fidelizacion.id_fidelizacion },
              data: { puntos_actuales: operation.puntos },
            });

            movimiento = {
              tipo: 'AJUSTE',
              puntos: operation.puntos,
              descripcion: operation.descripcion,
              fecha: new Date(),
              referencia: operation.referencia,
            };
            break;
        }

        resultados.push({
          clienteId: operation.clienteId,
          exito: true,
          mensaje: 'Operación completada exitosamente',
          movimiento,
        });
        exitosas++;
      } catch (error) {
        resultados.push({
          clienteId: operation.clienteId,
          exito: false,
          mensaje: error.message || 'Error desconocido',
        });
        fallidas++;
      }
    }

    return {
      exitosas,
      fallidas,
      resultados,
    };
  }

  /**
   * Obtener clientes próximos a cambiar de nivel
   */
  async getClientesProximosCambioNivel(
    empresaId: number,
    umbralPorcentaje: number = 80,
  ): Promise<
    Array<{
      cliente: any;
      nivel_actual: string;
      nivel_siguiente: string;
      puntos_actuales: number;
      puntos_necesarios: number;
      porcentaje_progreso: number;
    }>
  > {
    this.logger.log(
      `Buscando clientes próximos a cambio de nivel (${umbralPorcentaje}%)`,
    );

    const fidelizaciones = await this.prisma.fidelizacion.findMany({
      where: {
        cliente: {
          empresas: {
            some: { empresa_id: empresaId },
          },
        },
      },
      include: {
        cliente: true,
      },
    });

    const clientesProximos: Array<{
      cliente: any;
      nivel_actual: string;
      nivel_siguiente: string;
      puntos_actuales: number;
      puntos_necesarios: number;
      porcentaje_progreso: number;
    }> = [];

    for (const fidelizacion of fidelizaciones) {
      if (!fidelizacion.cliente) continue;

      const nivelActual = this.calculateNivelActual(
        fidelizacion.puntos_actuales,
      );
      const siguienteNivel = this.getNextLevel(nivelActual);

      if (siguienteNivel) {
        const puntosNecesarios = this.getPuntosParaNivel(siguienteNivel);
        const porcentajeProgreso =
          (fidelizacion.puntos_actuales / puntosNecesarios) * 100;

        if (porcentajeProgreso >= umbralPorcentaje) {
          clientesProximos.push({
            cliente: fidelizacion.cliente,
            nivel_actual: nivelActual,
            nivel_siguiente: siguienteNivel,
            puntos_actuales: fidelizacion.puntos_actuales,
            puntos_necesarios: puntosNecesarios - fidelizacion.puntos_actuales,
            porcentaje_progreso: Number(porcentajeProgreso.toFixed(2)),
          });
        }
      }
    }

    return clientesProximos.sort(
      (a, b) => b.porcentaje_progreso - a.porcentaje_progreso,
    );
  }

  // Métodos auxiliares privados

  private async buildAdvancedFilters(
    empresaId: number,
    searchParams: any,
  ): Promise<FidelizacionFilters> {
    const filters: FidelizacionFilters = {};

    if (searchParams.nivel) {
      // Convertir nivel a rango de puntos
      const rangoNivel = this.getNivelPuntosRange(searchParams.nivel);
      filters.puntosMinimos = rangoNivel.min;
      filters.puntosMaximos = rangoNivel.max;
    }

    if (searchParams.puntosMinimos) {
      filters.puntosMinimos = searchParams.puntosMinimos;
    }

    if (searchParams.puntosMaximos) {
      filters.puntosMaximos = searchParams.puntosMaximos;
    }

    if (searchParams.fechaInicio) {
      filters.fechaInicio = new Date(searchParams.fechaInicio);
    }

    if (searchParams.fechaFin) {
      filters.fechaFin = new Date(searchParams.fechaFin);
    }

    if (searchParams.activo !== undefined) {
      filters.activo = searchParams.activo;
    }

    // Para búsqueda por nombre o email, necesitaríamos obtener los IDs de clientes primero
    if (searchParams.nombreCliente || searchParams.emailCliente) {
      const whereCliente: any = {};

      if (searchParams.nombreCliente) {
        whereCliente.OR = [
          {
            nombre: {
              contains: searchParams.nombreCliente,
              mode: 'insensitive',
            },
          },
          {
            apellido: {
              contains: searchParams.nombreCliente,
              mode: 'insensitive',
            },
          },
        ];
      }

      if (searchParams.emailCliente) {
        whereCliente.email = {
          contains: searchParams.emailCliente,
          mode: 'insensitive',
        };
      }

      const clientesEncontrados = await this.prisma.cliente.findMany({
        where: {
          ...whereCliente,
          empresas: {
            some: { empresa_id: empresaId },
          },
        },
        select: { id_cliente: true },
      });

      if (clientesEncontrados.length > 0) {
        filters.clienteId = clientesEncontrados[0].id_cliente; // Simplificado para el ejemplo
      } else {
        // Si no se encuentran clientes, devolver filtro que no coincida con nada
        filters.clienteId = -1;
      }
    }

    return filters;
  }

  private getNivelPuntosRange(nivel: string): { min: number; max?: number } {
    switch (nivel.toUpperCase()) {
      case 'BRONCE':
        return { min: 0, max: 999 };
      case 'PLATA':
        return { min: 1000, max: 4999 };
      case 'ORO':
        return { min: 5000, max: 14999 };
      case 'PLATINO':
        return { min: 15000, max: 49999 };
      case 'DIAMANTE':
        return { min: 50000 };
      default:
        return { min: 0 };
    }
  }

  private getNextLevel(nivelActual: string): string | null {
    const niveles = ['BRONCE', 'PLATA', 'ORO', 'PLATINO', 'DIAMANTE'];
    const indiceActual = niveles.indexOf(nivelActual);

    if (indiceActual >= 0 && indiceActual < niveles.length - 1) {
      return niveles[indiceActual + 1];
    }

    return null; // Ya está en el nivel máximo
  }

  private getPuntosParaNivel(nivel: string): number {
    switch (nivel.toUpperCase()) {
      case 'PLATA':
        return 1000;
      case 'ORO':
        return 5000;
      case 'PLATINO':
        return 15000;
      case 'DIAMANTE':
        return 50000;
      default:
        return 0;
    }
  }

  // Hooks específicos del servicio principal

  protected async postCreateFidelizacion(
    fidelizacion: any,
    empresaId: number,
  ): Promise<void> {
    await super.postCreateFidelizacion(fidelizacion, empresaId);

    // Lógica específica adicional
    this.logger.log(
      `Enviando notificación de bienvenida al programa de fidelización`,
    );
    // Aquí se podría integrar con el servicio de notificaciones
  }

  protected async postAgregarPuntos(
    fidelizacion: any,
    movimiento: MovimientoPuntos,
    empresaId: number,
  ): Promise<void> {
    await super.postAgregarPuntos(fidelizacion, movimiento, empresaId);

    // Verificar si cambió de nivel
    const nivelAnterior = this.calculateNivelActual(
      fidelizacion.puntos_actuales - movimiento.puntos,
    );
    const nivelActual = this.calculateNivelActual(fidelizacion.puntos_actuales);

    if (nivelAnterior !== nivelActual) {
      this.logger.log(
        `Cliente cambió de nivel: ${nivelAnterior} → ${nivelActual}`,
      );
      // Aquí se podría enviar notificación de cambio de nivel
    }
  }

  protected async postCanjarPuntos(
    fidelizacion: any,
    movimiento: MovimientoPuntos,
    empresaId: number,
  ): Promise<void> {
    await super.postCanjarPuntos(fidelizacion, movimiento, empresaId);

    // Generar comprobante de canje
    this.logger.log(
      `Generando comprobante de canje para ${movimiento.puntos} puntos`,
    );
    // Aquí se podría generar un PDF o enviar email con el comprobante
  }
}
