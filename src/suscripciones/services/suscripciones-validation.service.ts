import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSuscripcionDto } from '../dto/create-suscripcion.dto';
import { CreatePagoSuscripcionDto } from '../dto/create-pago-suscripcion.dto';
import {
  PlanSuscripcion,
  EstadoSuscripcion,
  PLANES_CONFIG,
} from '../../common/enums/estados.enum';

/**
 * Servicio especializado para validaciones de suscripciones
 * Principio: Single Responsibility - Solo maneja validaciones
 * Contexto: Validaciones específicas para el mercado peruano SaaS
 */
@Injectable()
export class SuscripcionesValidationService {
  private readonly logger = new Logger(SuscripcionesValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida datos para crear una suscripción
   */
  async validateSuscripcionCreation(dto: CreateSuscripcionDto): Promise<void> {
    this.logger.log(
      `Validando creación de suscripción para empresa ${dto.id_empresa}`,
    );

    // Validar que la empresa existe y está activa
    await this.validateEmpresaExists(dto.id_empresa);

    // Validar que no existe suscripción activa
    await this.validateNoActiveSuscripcion(dto.id_empresa);

    // Validar plan de suscripción
    this.validatePlanSuscripcion(dto.plan);

    // Validar límites del plan
    this.validatePlanLimits(dto);

    // Validar fechas
    this.validateSuscripcionDates(dto);

    // Validar precio para mercado peruano
    this.validatePeruvianPricing(dto);

    this.logger.log('Validación de suscripción completada exitosamente');
  }

  /**
   * Valida datos para crear un pago de suscripción
   */
  async validatePagoCreation(dto: CreatePagoSuscripcionDto): Promise<void> {
    this.logger.log(
      `Validando creación de pago para suscripción ${dto.id_suscripcion}`,
    );

    // Validar que la suscripción existe
    await this.validateSuscripcionExists(dto.id_suscripcion);

    // Validar método de pago para Perú
    this.validatePeruvianPaymentMethod(dto.metodo_pago);

    // Validar monto del pago
    await this.validatePaymentAmount(dto);

    // Validar referencia de transacción si existe
    if (dto.referencia_externa) {
      this.validateTransactionReference(dto.referencia_externa);
    }

    // Validar fecha de pago si existe
    if (dto.periodo_inicio) {
      this.validatePaymentDate(dto.periodo_inicio);
    }

    this.logger.log('Validación de pago completada exitosamente');
  }

  /**
   * Valida cambio de plan de suscripción
   */
  async validatePlanChange(
    suscripcionId: number,
    nuevoPlan: PlanSuscripcion,
  ): Promise<void> {
    this.logger.log(
      `Validando cambio de plan para suscripción ${suscripcionId}`,
    );

    // Validar que la suscripción existe y está activa
    const suscripcion = await this.validateActiveSuscripcion(suscripcionId);

    // Validar que el nuevo plan es diferente
    if (suscripcion.plan === nuevoPlan) {
      throw new BadRequestException(
        'El nuevo plan debe ser diferente al plan actual',
      );
    }

    // Validar que el nuevo plan existe
    this.validatePlanSuscripcion(nuevoPlan);

    // Validar reglas de cambio de plan
    this.validatePlanChangeRules(suscripcion.plan, nuevoPlan);

    this.logger.log('Validación de cambio de plan completada exitosamente');
  }

  /**
   * Valida límites de uso de la suscripción
   */
  async validateUsageLimits(empresaId: number): Promise<void> {
    this.logger.log(`Validando límites de uso para empresa ${empresaId}`);

    const suscripcion = await this.prisma.suscripcionEmpresa.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!suscripcion || !suscripcion.activa) {
      throw new BadRequestException(
        'La empresa no tiene una suscripción activa',
      );
    }

    // Validar límite de clientes
    await this.validateClientesLimit(empresaId, suscripcion.limite_clientes);

    // Validar límite de productos
    await this.validateProductosLimit(empresaId, suscripcion.limite_productos);

    // Validar límite de usuarios
    await this.validateUsuariosLimit(empresaId, suscripcion.limite_usuarios);

    // Validar límite de mensajes WhatsApp
    await this.validateMensajesLimit(empresaId, suscripcion.limite_mensajes);

    this.logger.log('Validación de límites completada exitosamente');
  }

  /**
   * Valida que una empresa existe y está activa
   */
  private async validateEmpresaExists(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findFirst({
      where: {
        id_empresa: empresaId,
      },
      select: {
        id_empresa: true,
        nombre: true,
        ruc: true,
      },
    });

    if (!empresa) {
      throw new BadRequestException(
        `Empresa con ID ${empresaId} no encontrada`,
      );
    }

    // Validar RUC peruano
    this.validatePeruvianRUC(empresa.ruc);
  }

  /**
   * Valida que no existe suscripción activa
   */
  private async validateNoActiveSuscripcion(empresaId: number): Promise<void> {
    const suscripcionExistente = await this.prisma.suscripcionEmpresa.findFirst(
      {
        where: {
          id_empresa: empresaId,
          activa: true,
        },
      },
    );

    if (suscripcionExistente) {
      throw new BadRequestException(
        'La empresa ya tiene una suscripción activa',
      );
    }
  }

  /**
   * Valida que una suscripción existe
   */
  private async validateSuscripcionExists(suscripcionId: number): Promise<any> {
    const suscripcion = await this.prisma.suscripcionEmpresa.findUnique({
      where: { id_suscripcion: suscripcionId },
    });

    if (!suscripcion) {
      throw new BadRequestException(
        `Suscripción con ID ${suscripcionId} no encontrada`,
      );
    }

    return suscripcion;
  }

  /**
   * Valida que una suscripción existe y está activa
   */
  private async validateActiveSuscripcion(suscripcionId: number): Promise<any> {
    const suscripcion = await this.validateSuscripcionExists(suscripcionId);

    if (!suscripcion.activa) {
      throw new BadRequestException('La suscripción no está activa');
    }

    if (suscripcion.estado === EstadoSuscripcion.SUSPENDIDA) {
      throw new BadRequestException(
        'No se pueden realizar cambios en una suscripción suspendida',
      );
    }

    return suscripcion;
  }

  /**
   * Valida plan de suscripción
   */
  private validatePlanSuscripcion(plan: PlanSuscripcion): void {
    if (!Object.values(PlanSuscripcion).includes(plan)) {
      throw new BadRequestException(`Plan de suscripción inválido: ${plan}`);
    }

    if (!PLANES_CONFIG[plan]) {
      throw new BadRequestException(
        `Configuración no encontrada para el plan: ${plan}`,
      );
    }
  }

  /**
   * Valida límites del plan
   */
  private validatePlanLimits(dto: CreateSuscripcionDto): void {
    const planConfig = PLANES_CONFIG[dto.plan];

    if (
      dto.limite_clientes &&
      dto.limite_clientes > planConfig.limite_clientes
    ) {
      throw new BadRequestException(
        `Límite de clientes excede el máximo del plan ${dto.plan}`,
      );
    }

    if (
      dto.limite_productos &&
      dto.limite_productos > planConfig.limite_productos
    ) {
      throw new BadRequestException(
        `Límite de productos excede el máximo del plan ${dto.plan}`,
      );
    }

    if (
      dto.limite_usuarios &&
      dto.limite_usuarios > planConfig.limite_usuarios
    ) {
      throw new BadRequestException(
        `Límite de usuarios excede el máximo del plan ${dto.plan}`,
      );
    }

    if (
      dto.limite_mensajes &&
      dto.limite_mensajes > planConfig.limite_mensajes
    ) {
      throw new BadRequestException(
        `Límite de mensajes excede el máximo del plan ${dto.plan}`,
      );
    }
  }

  /**
   * Valida fechas de suscripción
   */
  private validateSuscripcionDates(dto: CreateSuscripcionDto): void {
    if (dto.fecha_fin) {
      const fechaFin = new Date(dto.fecha_fin);
      const ahora = new Date();

      if (fechaFin <= ahora) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha actual',
        );
      }
    }

    if (dto.fecha_proximo_pago) {
      const fechaPago = new Date(dto.fecha_proximo_pago);
      const ahora = new Date();

      if (fechaPago <= ahora) {
        throw new BadRequestException(
          'La fecha del próximo pago debe ser posterior a la fecha actual',
        );
      }
    }
  }

  /**
   * Valida precios para el mercado peruano
   */
  private validatePeruvianPricing(dto: CreateSuscripcionDto): void {
    if (dto.precio_mensual !== undefined) {
      if (dto.precio_mensual < 0) {
        throw new BadRequestException(
          'El precio mensual no puede ser negativo',
        );
      }

      // Validar que el precio esté en rango razonable para Perú (en soles)
      if (dto.precio_mensual > 10000) {
        throw new BadRequestException(
          'El precio mensual excede el límite máximo permitido (S/ 10,000)',
        );
      }
    }
  }

  /**
   * Valida RUC peruano
   */
  private validatePeruvianRUC(ruc: string): void {
    if (!ruc || ruc.length !== 11) {
      throw new BadRequestException('RUC debe tener exactamente 11 dígitos');
    }

    if (!/^\d{11}$/.test(ruc)) {
      throw new BadRequestException('RUC debe contener solo números');
    }

    // Validar que comience con 10 o 20 (empresas peruanas)
    if (!ruc.startsWith('10') && !ruc.startsWith('20')) {
      throw new BadRequestException(
        'RUC debe comenzar con 10 o 20 para empresas peruanas',
      );
    }
  }

  /**
   * Valida método de pago para Perú
   */
  private validatePeruvianPaymentMethod(metodoPago: string): void {
    const metodosValidos = [
      'TARJETA_CREDITO',
      'TARJETA_DEBITO',
      'TRANSFERENCIA_BANCARIA',
      'YAPE',
      'PLIN',
      'EFECTIVO',
      'DEPOSITO_BANCARIO',
    ];

    if (!metodosValidos.includes(metodoPago)) {
      throw new BadRequestException(
        `Método de pago no válido para Perú: ${metodoPago}`,
      );
    }
  }

  /**
   * Valida monto del pago
   */
  private async validatePaymentAmount(
    dto: CreatePagoSuscripcionDto,
  ): Promise<void> {
    const suscripcion = await this.prisma.suscripcionEmpresa.findUnique({
      where: { id_suscripcion: dto.id_suscripcion },
    });

    if (dto.monto <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a cero');
    }

    // Validar que el monto coincida con el precio de la suscripción
    if (
      suscripcion &&
      Math.abs(dto.monto - Number(suscripcion.precio_mensual)) > 0.01
    ) {
      this.logger.warn(
        `Monto del pago (${dto.monto}) no coincide exactamente con precio mensual (${suscripcion.precio_mensual})`,
      );
    }
  }

  /**
   * Valida referencia de transacción
   */
  private validateTransactionReference(referencia: string): void {
    if (!referencia || referencia.trim().length === 0) {
      throw new BadRequestException(
        'La referencia de transacción es obligatoria',
      );
    }

    if (referencia.length > 100) {
      throw new BadRequestException(
        'La referencia de transacción no puede exceder 100 caracteres',
      );
    }
  }

  /**
   * Valida fecha de pago
   */
  private validatePaymentDate(fechaPago: string | Date): void {
    const fecha = new Date(fechaPago);
    const ahora = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    if (fecha > ahora) {
      throw new BadRequestException('La fecha de pago no puede ser futura');
    }

    if (fecha < hace30Dias) {
      throw new BadRequestException(
        'La fecha de pago no puede ser anterior a 30 días',
      );
    }
  }

  /**
   * Valida reglas de cambio de plan
   */
  private validatePlanChangeRules(
    planActual: PlanSuscripcion,
    nuevoPlan: PlanSuscripcion,
  ): void {
    // Reglas específicas para el mercado peruano
    const jerarquiaPlanes = {
      [PlanSuscripcion.BASICO]: 1,
      [PlanSuscripcion.PRO]: 2,
      [PlanSuscripcion.ENTERPRISE]: 3,
    };

    const nivelActual = jerarquiaPlanes[planActual];
    const nivelNuevo = jerarquiaPlanes[nuevoPlan];

    // Permitir upgrade siempre
    if (nivelNuevo > nivelActual) {
      return;
    }

    // Para downgrade, validar que no exceda límites actuales
    if (nivelNuevo < nivelActual) {
      this.logger.warn(
        `Downgrade detectado de ${planActual} a ${nuevoPlan}. Se requiere validación adicional.`,
      );
    }
  }

  /**
   * Valida límite de clientes
   */
  private async validateClientesLimit(
    empresaId: number,
    limite: number,
  ): Promise<void> {
    const clientesActuales = await this.prisma.cliente.count({
      where: {
        empresas: {
          some: { empresa_id: empresaId },
        },
      },
    });

    if (clientesActuales >= limite) {
      throw new BadRequestException(
        `Límite de clientes alcanzado (${clientesActuales}/${limite})`,
      );
    }
  }

  /**
   * Valida límite de productos
   */
  private async validateProductosLimit(
    empresaId: number,
    limite: number,
  ): Promise<void> {
    const productosActuales = await this.prisma.productoServicio.count({
      where: { id_empresa: empresaId },
    });

    if (productosActuales >= limite) {
      throw new BadRequestException(
        `Límite de productos alcanzado (${productosActuales}/${limite})`,
      );
    }
  }

  /**
   * Valida límite de usuarios
   */
  private async validateUsuariosLimit(
    empresaId: number,
    limite: number,
  ): Promise<void> {
    const usuariosActuales = await this.prisma.usuarioEmpresa.count({
      where: {
        empresa: {
          id_empresa: empresaId,
        },
      },
    });

    if (usuariosActuales >= limite) {
      throw new BadRequestException(
        `Límite de usuarios alcanzado (${usuariosActuales}/${limite})`,
      );
    }
  }

  /**
   * Valida límite de mensajes WhatsApp
   */
  private async validateMensajesLimit(
    empresaId: number,
    limite: number,
  ): Promise<void> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const mensajesEsteMes = await this.prisma.mensajeWhatsapp.count({
      where: {
        consulta: {
          id_empresa: empresaId,
        },
        fecha_mensaje: {
          gte: inicioMes,
        },
        es_entrante: false, // Solo contar mensajes enviados
      },
    });

    if (mensajesEsteMes >= limite) {
      throw new BadRequestException(
        `Límite de mensajes WhatsApp alcanzado este mes (${mensajesEsteMes}/${limite})`,
      );
    }
  }
}
