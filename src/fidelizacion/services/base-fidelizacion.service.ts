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
  FidelizacionValidationService,
  FidelizacionFilters,
} from './fidelizacion-validation.service';
import { FidelizacionCalculationService } from './fidelizacion-calculation.service';

export interface FidelizacionFormatted {
  id_fidelizacion: number;
  id_cliente: number;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  puntos_actuales: number;
  cliente: {
    id_cliente: number;
    nombre_completo: string;
    email: string;
    telefono: string;
  };
  programa: {
    nombre: string;
    descripcion: string;
    nivel_actual: string;
    puntos_por_compra: number;
    valor_punto: number;
    beneficios: any;
  };
  estadisticas: {
    dias_en_programa: number;
    total_compras: number;
    monto_total_compras: number;
    puntos_ganados_historicos: number;
    puntos_canjeados_historicos: number;
    frecuencia_compra_mensual: number;
  };
  contexto_peruano: {
    es_cliente_verificado: boolean;
    cumple_normativas: boolean;
    nivel_confianza: 'ALTO' | 'MEDIO' | 'BAJO';
    elegible_beneficios_especiales: boolean;
  };
}

export interface PaginatedFidelizaciones {
  data: FidelizacionFormatted[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  estadisticas: {
    total_clientes_fidelizados: number;
    promedio_puntos: number;
    distribucion_niveles: any;
  };
}

export interface MovimientoPuntos {
  tipo: 'GANADO' | 'CANJEADO' | 'AJUSTE' | 'EXPIRACION';
  puntos: number;
  descripcion: string;
  fecha: Date;
  referencia?: string;
}

@Injectable()
export class BaseFidelizacionService {
  protected readonly logger = new Logger(BaseFidelizacionService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: FidelizacionValidationService,
    protected readonly calculationService: FidelizacionCalculationService,
  ) {}

  /**
   * Template Method: Crear programa de fidelización
   */
  async createFidelizacion(
    createFidelizacionDto: CreateFidelizacionDto,
    empresaId: number,
  ): Promise<FidelizacionFormatted> {
    this.logger.log(`Creando fidelización para empresa ${empresaId}`);

    // Validaciones
    await this.validateCreateFidelizacion(createFidelizacionDto, empresaId);

    // Preparar datos
    const fidelizacionData = await this.prepareFidelizacionData(
      createFidelizacionDto,
    );

    // Crear fidelización
    const fidelizacion = await this.executeCreateFidelizacion(fidelizacionData);

    // Post-procesamiento
    await this.postCreateFidelizacion(fidelizacion, empresaId);

    // Formatear respuesta
    return await this.formatFidelizacionResponse(
      fidelizacion.id_fidelizacion,
      empresaId,
    );
  }

  /**
   * Template Method: Obtener fidelizaciones paginadas
   */
  async getFidelizaciones(
    empresaId: number,
    page: number = 1,
    limit: number = 10,
    filters: FidelizacionFilters = {},
  ): Promise<PaginatedFidelizaciones> {
    this.logger.log(`Obteniendo fidelizaciones para empresa ${empresaId}`);

    // Validaciones
    const { page: validatedPage, limit: validatedLimit } =
      this.validationService.validatePaginationParams(page, limit);
    this.validationService.validateFilters(filters);

    // Construir query
    const whereClause = await this.buildWhereClause(empresaId, filters);

    // Ejecutar consultas
    const [fidelizaciones, total] = await Promise.all([
      this.executeGetFidelizaciones(whereClause, validatedPage, validatedLimit),
      this.executeCountFidelizaciones(whereClause),
    ]);

    // Formatear respuestas
    const formattedFidelizaciones = await Promise.all(
      fidelizaciones.map((f) =>
        this.formatFidelizacionResponse(f.id_fidelizacion, empresaId),
      ),
    );

    // Calcular estadísticas
    const estadisticas = await this.calculatePageStatistics(
      empresaId,
      fidelizaciones,
    );

    return {
      data: formattedFidelizaciones,
      meta: {
        total,
        page: validatedPage,
        limit: validatedLimit,
        total_pages: Math.ceil(total / validatedLimit),
      },
      estadisticas,
    };
  }

  /**
   * Template Method: Actualizar puntos de fidelización
   */
  async updatePuntosFidelizacion(
    clienteId: number,
    updateDto: UpdatePuntosFidelizacionDto,
    empresaId: number,
  ): Promise<FidelizacionFormatted> {
    this.logger.log(`Actualizando puntos para cliente ${clienteId}`);

    // Validaciones
    const fidelizacion = await this.validationService.validateUpdateData(
      empresaId,
      clienteId,
      updateDto,
    );

    // Preparar datos de actualización
    const updateData = await this.prepareUpdateData(updateDto, fidelizacion);

    // Ejecutar actualización
    const fidelizacionActualizada = await this.executeUpdatePuntos(
      fidelizacion.id_fidelizacion,
      updateData,
    );

    // Post-procesamiento
    await this.postUpdatePuntos(fidelizacionActualizada, empresaId);

    // Formatear respuesta
    return await this.formatFidelizacionResponse(
      fidelizacion.id_fidelizacion,
      empresaId,
    );
  }

  /**
   * Template Method: Agregar puntos por compra
   */
  async agregarPuntosPorCompra(
    clienteId: number,
    montoCompra: number,
    empresaId: number,
    ordenVentaId?: number,
  ): Promise<MovimientoPuntos> {
    this.logger.log(`Agregando puntos por compra para cliente ${clienteId}`);

    // Validaciones
    await this.validationService.validateClienteEmpresa(clienteId, empresaId);
    const fidelizacion =
      await this.validationService.validateFidelizacionExists(clienteId);

    // Calcular puntos a otorgar
    const puntosAOtorgar = await this.calculatePuntosCompra(
      montoCompra,
      empresaId,
    );

    // Preparar movimiento
    const movimiento = await this.prepareMovimientoPuntos(
      'GANADO',
      puntosAOtorgar,
      `Puntos por compra de S/. ${montoCompra.toFixed(2)}`,
      ordenVentaId?.toString(),
    );

    // Ejecutar actualización de puntos
    await this.executeAgregarPuntos(
      fidelizacion.id_fidelizacion,
      puntosAOtorgar,
    );

    // Post-procesamiento
    await this.postAgregarPuntos(fidelizacion, movimiento, empresaId);

    return movimiento;
  }

  /**
   * Template Method: Canjear puntos
   */
  async canjearPuntos(
    clienteId: number,
    puntosACanjear: number,
    descripcionCanje: string,
    empresaId: number,
  ): Promise<MovimientoPuntos> {
    this.logger.log(
      `Canjeando ${puntosACanjear} puntos para cliente ${clienteId}`,
    );

    // Validaciones
    const { fidelizacion } = await this.validationService.validateCanjePoints(
      clienteId,
      puntosACanjear,
    );

    // Preparar movimiento
    const movimiento = await this.prepareMovimientoPuntos(
      'CANJEADO',
      puntosACanjear,
      descripcionCanje,
    );

    // Ejecutar canje
    await this.executeCanjarPuntos(
      fidelizacion.id_fidelizacion,
      puntosACanjear,
    );

    // Post-procesamiento
    await this.postCanjarPuntos(fidelizacion, movimiento, empresaId);

    return movimiento;
  }

  /**
   * Template Method: Eliminar fidelización
   */
  async deleteFidelizacion(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(`Eliminando fidelización para cliente ${clienteId}`);

    // Validaciones
    await this.validationService.validateClienteEmpresa(clienteId, empresaId);
    const fidelizacion =
      await this.validationService.validateFidelizacionExists(clienteId);

    // Pre-eliminación
    await this.preDeleteFidelizacion(fidelizacion, empresaId);

    // Ejecutar eliminación
    await this.executeDeleteFidelizacion(fidelizacion.id_fidelizacion);

    // Post-eliminación
    await this.postDeleteFidelizacion(fidelizacion, empresaId);
  }

  // Métodos de validación

  protected async validateCreateFidelizacion(
    createDto: CreateFidelizacionDto,
    empresaId: number,
  ): Promise<void> {
    await this.validationService.validateCreateData(empresaId, createDto);
    this.validationService.validateCumplimientoNormativo(createDto);
    this.validationService.validateInformacionSensible(createDto);
  }

  // Métodos de preparación de datos

  protected async prepareFidelizacionData(
    createDto: CreateFidelizacionDto,
  ): Promise<any> {
    return {
      id_cliente: createDto.cliente_id,
      fecha_inicio: createDto.fechaInicio
        ? new Date(createDto.fechaInicio)
        : new Date(),
      fecha_fin: createDto.fechaExpiracion
        ? new Date(createDto.fechaExpiracion)
        : null,
      puntos_actuales: createDto.puntos || 0,
    };
  }

  protected async prepareUpdateData(
    updateDto: UpdatePuntosFidelizacionDto,
    fidelizacion: any,
  ): Promise<any> {
    const updateData: any = {};

    if (updateDto.puntos_actuales !== undefined) {
      updateData.puntos_actuales = updateDto.puntos_actuales;
    }

    if (updateDto.fecha_fin) {
      updateData.fecha_fin = new Date(updateDto.fecha_fin);
    }

    return updateData;
  }

  protected async prepareMovimientoPuntos(
    tipo: 'GANADO' | 'CANJEADO' | 'AJUSTE' | 'EXPIRACION',
    puntos: number,
    descripcion: string,
    referencia?: string,
  ): Promise<MovimientoPuntos> {
    return {
      tipo,
      puntos,
      descripcion,
      fecha: new Date(),
      referencia,
    };
  }

  // Métodos de ejecución

  protected async executeCreateFidelizacion(
    fidelizacionData: any,
  ): Promise<any> {
    return await this.prisma.fidelizacion.create({
      data: fidelizacionData,
    });
  }

  protected async executeGetFidelizaciones(
    whereClause: any,
    page: number,
    limit: number,
  ): Promise<any[]> {
    return await this.prisma.fidelizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
      },
      orderBy: {
        fecha_inicio: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  protected async executeCountFidelizaciones(
    whereClause: any,
  ): Promise<number> {
    return await this.prisma.fidelizacion.count({
      where: whereClause,
    });
  }

  protected async executeUpdatePuntos(
    fidelizacionId: number,
    updateData: any,
  ): Promise<any> {
    return await this.prisma.fidelizacion.update({
      where: { id_fidelizacion: fidelizacionId },
      data: updateData,
    });
  }

  protected async executeAgregarPuntos(
    fidelizacionId: number,
    puntosAOtorgar: number,
  ): Promise<any> {
    return await this.prisma.fidelizacion.update({
      where: { id_fidelizacion: fidelizacionId },
      data: {
        puntos_actuales: {
          increment: puntosAOtorgar,
        },
      },
    });
  }

  protected async executeCanjarPuntos(
    fidelizacionId: number,
    puntosACanjear: number,
  ): Promise<any> {
    return await this.prisma.fidelizacion.update({
      where: { id_fidelizacion: fidelizacionId },
      data: {
        puntos_actuales: {
          decrement: puntosACanjear,
        },
      },
    });
  }

  protected async executeDeleteFidelizacion(
    fidelizacionId: number,
  ): Promise<void> {
    await this.prisma.fidelizacion.delete({
      where: { id_fidelizacion: fidelizacionId },
    });
  }

  // Métodos de construcción de queries

  protected async buildWhereClause(
    empresaId: number,
    filters: FidelizacionFilters,
  ): Promise<any> {
    // Obtener IDs de clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    const whereClause: any = {
      id_cliente: { in: clienteIds },
    };

    if (filters.clienteId) {
      whereClause.id_cliente = filters.clienteId;
    }

    if (filters.puntosMinimos || filters.puntosMaximos) {
      whereClause.puntos_actuales = {};
      if (filters.puntosMinimos) {
        whereClause.puntos_actuales.gte = filters.puntosMinimos;
      }
      if (filters.puntosMaximos) {
        whereClause.puntos_actuales.lte = filters.puntosMaximos;
      }
    }

    if (filters.fechaInicio || filters.fechaFin) {
      whereClause.fecha_inicio = {};
      if (filters.fechaInicio) {
        whereClause.fecha_inicio.gte = filters.fechaInicio;
      }
      if (filters.fechaFin) {
        whereClause.fecha_inicio.lte = filters.fechaFin;
      }
    }

    if (filters.activo !== undefined) {
      if (filters.activo) {
        whereClause.OR = [
          { fecha_fin: null },
          { fecha_fin: { gt: new Date() } },
        ];
      } else {
        whereClause.fecha_fin = { lte: new Date() };
      }
    }

    return whereClause;
  }

  // Métodos de formateo

  protected async formatFidelizacionResponse(
    fidelizacionId: number,
    empresaId: number,
  ): Promise<FidelizacionFormatted> {
    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: { id_fidelizacion: fidelizacionId },
      include: {
        cliente: true,
      },
    });

    if (!fidelizacion) {
      throw new NotFoundException('Fidelización no encontrada');
    }

    // Obtener estadísticas del cliente
    const estadisticasCliente =
      await this.calculationService.calculateEstadisticasCliente(
        fidelizacion.id_cliente,
        empresaId,
      );

    // Calcular nivel de confianza
    const nivelConfianza = this.calculateNivelConfianza(
      fidelizacion,
      estadisticasCliente,
    );

    // Verificar elegibilidad para beneficios especiales
    const elegibleBeneficios = this.checkElegibilidadBeneficios(
      fidelizacion,
      estadisticasCliente,
    );

    return {
      id_fidelizacion: fidelizacion.id_fidelizacion,
      id_cliente: fidelizacion.id_cliente,
      fecha_inicio: fidelizacion.fecha_inicio,
      fecha_fin: fidelizacion.fecha_fin,
      puntos_actuales: fidelizacion.puntos_actuales,
      cliente: {
        id_cliente: fidelizacion.cliente.id_cliente,
        nombre_completo: fidelizacion.cliente.nombre,
        email: fidelizacion.cliente.email,
        telefono: fidelizacion.cliente.telefono || '',
      },
      programa: {
        nombre: 'Programa de Fidelización BusinessGo',
        descripcion: 'Programa de lealtad para clientes frecuentes',
        nivel_actual: estadisticasCliente.nivel_actual,
        puntos_por_compra: 1, // 1% del monto de compra
        valor_punto: 0.01, // S/. 0.01 por punto
        beneficios: this.getBeneficiosPorNivel(
          estadisticasCliente.nivel_actual,
        ),
      },
      estadisticas: {
        dias_en_programa: estadisticasCliente.dias_en_programa,
        total_compras: estadisticasCliente.compras_realizadas,
        monto_total_compras: estadisticasCliente.monto_total_compras,
        puntos_ganados_historicos:
          estadisticasCliente.puntos_historicos_ganados,
        puntos_canjeados_historicos:
          estadisticasCliente.puntos_historicos_canjeados,
        frecuencia_compra_mensual:
          estadisticasCliente.frecuencia_compra_mensual,
      },
      contexto_peruano: {
        es_cliente_verificado: estadisticasCliente.compras_realizadas > 0,
        cumple_normativas: this.validateCumplimientoNormativas(fidelizacion),
        nivel_confianza: nivelConfianza,
        elegible_beneficios_especiales: elegibleBeneficios,
      },
    };
  }

  // Métodos de cálculo

  protected async calculatePageStatistics(
    empresaId: number,
    fidelizaciones: any[],
  ): Promise<any> {
    if (fidelizaciones.length === 0) {
      return {
        total_clientes_fidelizados: 0,
        promedio_puntos: 0,
        distribucion_niveles: {
          bronce: 0,
          plata: 0,
          oro: 0,
          platino: 0,
          diamante: 0,
        },
      };
    }

    const totalPuntos = fidelizaciones.reduce(
      (sum, f) => sum + f.puntos_actuales,
      0,
    );
    const promedioPuntos = totalPuntos / fidelizaciones.length;

    const distribucion = {
      bronce: 0,
      plata: 0,
      oro: 0,
      platino: 0,
      diamante: 0,
    };

    fidelizaciones.forEach((fidelizacion) => {
      const nivel = this.calculateNivelActual(fidelizacion.puntos_actuales);
      switch (nivel.toLowerCase()) {
        case 'bronce':
          distribucion.bronce++;
          break;
        case 'plata':
          distribucion.plata++;
          break;
        case 'oro':
          distribucion.oro++;
          break;
        case 'platino':
          distribucion.platino++;
          break;
        case 'diamante':
          distribucion.diamante++;
          break;
      }
    });

    return {
      total_clientes_fidelizados: fidelizaciones.length,
      promedio_puntos: Number(promedioPuntos.toFixed(2)),
      distribucion_niveles: distribucion,
    };
  }

  protected async calculatePuntosCompra(
    montoCompra: number,
    empresaId: number,
  ): Promise<number> {
    // Por defecto, 1% del monto de compra se convierte en puntos
    // Esto podría ser configurable por empresa en el futuro
    return Math.floor(montoCompra * 0.01);
  }

  protected calculateNivelActual(puntos: number): string {
    if (puntos >= 50000) return 'DIAMANTE';
    if (puntos >= 15000) return 'PLATINO';
    if (puntos >= 5000) return 'ORO';
    if (puntos >= 1000) return 'PLATA';
    return 'BRONCE';
  }

  protected calculateNivelConfianza(
    fidelizacion: any,
    estadisticas: any,
  ): 'ALTO' | 'MEDIO' | 'BAJO' {
    let puntuacion = 0;

    // Cliente con compras verificadas
    if (estadisticas.compras_realizadas > 0) puntuacion += 3;

    // Cliente con programa activo por más de 30 días
    if (estadisticas.dias_en_programa > 30) puntuacion += 2;

    // Cliente con frecuencia de compra regular
    if (estadisticas.frecuencia_compra_mensual >= 1) puntuacion += 2;

    // Cliente con monto significativo de compras
    if (estadisticas.monto_total_compras > 1000) puntuacion += 2;

    // Nivel alto de fidelización
    const nivel = this.calculateNivelActual(fidelizacion.puntos_actuales);
    if (['ORO', 'PLATINO', 'DIAMANTE'].includes(nivel)) puntuacion += 1;

    if (puntuacion >= 7) return 'ALTO';
    if (puntuacion >= 4) return 'MEDIO';
    return 'BAJO';
  }

  protected checkElegibilidadBeneficios(
    fidelizacion: any,
    estadisticas: any,
  ): boolean {
    // Criterios para beneficios especiales en contexto peruano
    const nivel = this.calculateNivelActual(fidelizacion.puntos_actuales);
    const tieneComprasRecientes = estadisticas.frecuencia_compra_mensual > 0.5;
    const esClienteEstable = estadisticas.dias_en_programa > 90;

    return (
      ['ORO', 'PLATINO', 'DIAMANTE'].includes(nivel) &&
      tieneComprasRecientes &&
      esClienteEstable
    );
  }

  protected getBeneficiosPorNivel(nivel: string): any {
    const beneficios = {
      BRONCE: {
        descuento_compras: '2%',
        puntos_extra_cumpleanos: 100,
        acceso_promociones_especiales: false,
      },
      PLATA: {
        descuento_compras: '5%',
        puntos_extra_cumpleanos: 250,
        acceso_promociones_especiales: true,
        envio_gratis_compras_minimas: 'S/. 100',
      },
      ORO: {
        descuento_compras: '8%',
        puntos_extra_cumpleanos: 500,
        acceso_promociones_especiales: true,
        envio_gratis_compras_minimas: 'S/. 50',
        atencion_prioritaria: true,
      },
      PLATINO: {
        descuento_compras: '12%',
        puntos_extra_cumpleanos: 1000,
        acceso_promociones_especiales: true,
        envio_gratis_siempre: true,
        atencion_prioritaria: true,
        acceso_productos_exclusivos: true,
      },
      DIAMANTE: {
        descuento_compras: '15%',
        puntos_extra_cumpleanos: 2000,
        acceso_promociones_especiales: true,
        envio_gratis_siempre: true,
        atencion_prioritaria: true,
        acceso_productos_exclusivos: true,
        gestor_personal: true,
        eventos_exclusivos: true,
      },
    };

    return beneficios[nivel] || beneficios.BRONCE;
  }

  protected validateCumplimientoNormativas(fidelizacion: any): boolean {
    // Validaciones básicas según normativas peruanas

    // Programa debe tener fecha de inicio válida
    if (!fidelizacion.fecha_inicio) return false;

    // Si tiene fecha de fin, debe ser futura o null
    if (fidelizacion.fecha_fin && fidelizacion.fecha_fin <= new Date()) {
      return false;
    }

    // Puntos no pueden ser negativos
    if (fidelizacion.puntos_actuales < 0) return false;

    return true;
  }

  // Métodos de post-procesamiento (hooks)

  protected async postCreateFidelizacion(
    fidelizacion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Fidelización ${fidelizacion.id_fidelizacion} creada exitosamente`,
    );
    // Hook para notificaciones, bienvenida al programa, etc.
  }

  protected async postUpdatePuntos(
    fidelizacion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Puntos actualizados para fidelización ${fidelizacion.id_fidelizacion}`,
    );
    // Hook para notificaciones de cambio de nivel, etc.
  }

  protected async postAgregarPuntos(
    fidelizacion: any,
    movimiento: MovimientoPuntos,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Puntos agregados: ${movimiento.puntos} para fidelización ${fidelizacion.id_fidelizacion}`,
    );
    // Hook para notificaciones, verificar cambio de nivel, etc.
  }

  protected async postCanjarPuntos(
    fidelizacion: any,
    movimiento: MovimientoPuntos,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Puntos canjeados: ${movimiento.puntos} para fidelización ${fidelizacion.id_fidelizacion}`,
    );
    // Hook para notificaciones, generar comprobante de canje, etc.
  }

  protected async postDeleteFidelizacion(
    fidelizacion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Fidelización ${fidelizacion.id_fidelizacion} eliminada exitosamente`,
    );
    // Hook para notificaciones, limpieza de datos relacionados, etc.
  }

  protected async preDeleteFidelizacion(
    fidelizacion: any,
    empresaId: number,
  ): Promise<void> {
    // Validaciones adicionales antes de eliminar
    if (fidelizacion.puntos_actuales > 0) {
      this.logger.warn(
        `Eliminando fidelización con ${fidelizacion.puntos_actuales} puntos pendientes`,
      );
    }
  }
}
