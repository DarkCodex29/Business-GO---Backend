import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFidelizacionDto } from '../dto/create-fidelizacion.dto';
import { UpdatePuntosFidelizacionDto } from '../dto/update-puntos-fidelizacion.dto';

export interface FidelizacionFilters {
  clienteId?: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  puntosMinimos?: number;
  puntosMaximos?: number;
  activo?: boolean;
  nivel?: string;
}

@Injectable()
export class FidelizacionValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida que el cliente pertenezca a la empresa
   */
  async validateClienteEmpresa(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    if (!clienteId || !empresaId) {
      throw new BadRequestException('ID de cliente y empresa son requeridos');
    }

    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no está asociado a la empresa ${empresaId}`,
      );
    }
  }

  /**
   * Valida que no exista una fidelización activa para el cliente
   */
  async validateFidelizacionUnica(clienteId: number): Promise<void> {
    const fidelizacionExistente = await this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
    });

    if (fidelizacionExistente) {
      throw new ConflictException(
        `El cliente ${clienteId} ya tiene una fidelización activa`,
      );
    }
  }

  /**
   * Valida que exista una fidelización para el cliente
   */
  async validateFidelizacionExists(clienteId: number): Promise<any> {
    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    if (!fidelizacion) {
      throw new NotFoundException(
        `No existe una fidelización para el cliente ${clienteId}`,
      );
    }

    return fidelizacion;
  }

  /**
   * Valida los datos de creación de fidelización
   */
  async validateCreateData(
    empresaId: number,
    createDto: CreateFidelizacionDto,
  ): Promise<void> {
    // Validar cliente-empresa
    await this.validateClienteEmpresa(createDto.cliente_id, empresaId);

    // Validar fidelización única
    await this.validateFidelizacionUnica(createDto.cliente_id);

    // Validar puntos iniciales
    if (createDto.puntos < 0) {
      throw new BadRequestException(
        'Los puntos iniciales no pueden ser negativos',
      );
    }

    // Validar fechas si se proporcionan
    if (createDto.fechaInicio && createDto.fechaExpiracion) {
      const fechaInicio = new Date(createDto.fechaInicio);
      const fechaExpiracion = new Date(createDto.fechaExpiracion);

      if (fechaExpiracion <= fechaInicio) {
        throw new BadRequestException(
          'La fecha de expiración debe ser posterior a la fecha de inicio',
        );
      }
    }

    // Validar nivel
    if (createDto.nivel) {
      this.validateNivel(createDto.nivel);
    }

    // Validar beneficios JSON
    if (createDto.beneficios) {
      try {
        JSON.parse(createDto.beneficios);
      } catch (error) {
        throw new BadRequestException(
          'El formato de beneficios debe ser JSON válido',
        );
      }
    }
  }

  /**
   * Valida los datos de actualización de puntos
   */
  async validateUpdateData(
    empresaId: number,
    clienteId: number,
    updateDto: UpdatePuntosFidelizacionDto,
  ): Promise<any> {
    // Validar cliente-empresa
    await this.validateClienteEmpresa(clienteId, empresaId);

    // Validar que existe la fidelización
    const fidelizacion = await this.validateFidelizacionExists(clienteId);

    // Validar puntos
    if (updateDto.puntos_actuales < 0) {
      throw new BadRequestException('Los puntos no pueden ser negativos');
    }

    // Validar fecha de fin
    if (updateDto.fecha_fin) {
      const fechaFin = new Date(updateDto.fecha_fin);
      const fechaActual = new Date();

      if (fechaFin <= fechaActual) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha actual',
        );
      }

      if (fechaFin <= fidelizacion.fecha_inicio) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio de la fidelización',
        );
      }
    }

    return fidelizacion;
  }

  /**
   * Valida los filtros de búsqueda
   */
  validateFilters(filters: FidelizacionFilters): void {
    if (filters.puntosMinimos && filters.puntosMinimos < 0) {
      throw new BadRequestException(
        'Los puntos mínimos no pueden ser negativos',
      );
    }

    if (filters.puntosMaximos && filters.puntosMaximos < 0) {
      throw new BadRequestException(
        'Los puntos máximos no pueden ser negativos',
      );
    }

    if (
      filters.puntosMinimos &&
      filters.puntosMaximos &&
      filters.puntosMinimos > filters.puntosMaximos
    ) {
      throw new BadRequestException(
        'Los puntos mínimos no pueden ser mayores que los puntos máximos',
      );
    }

    if (
      filters.fechaInicio &&
      filters.fechaFin &&
      filters.fechaInicio > filters.fechaFin
    ) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser posterior a la fecha de fin',
      );
    }

    if (filters.nivel) {
      this.validateNivel(filters.nivel);
    }
  }

  /**
   * Valida el nivel de fidelización
   */
  private validateNivel(nivel: string): void {
    const nivelesValidos = ['BRONCE', 'PLATA', 'ORO', 'PLATINO', 'DIAMANTE'];

    if (!nivelesValidos.includes(nivel.toUpperCase())) {
      throw new BadRequestException(
        `Nivel inválido. Los niveles válidos son: ${nivelesValidos.join(', ')}`,
      );
    }
  }

  /**
   * Valida que el cliente tenga compras suficientes para el programa de fidelización
   */
  async validateComprasCliente(
    clienteId: number,
    empresaId: number,
  ): Promise<any> {
    const compras = await this.prisma.ordenVenta.findMany({
      where: {
        id_cliente: clienteId,
        id_empresa: empresaId,
        estado: 'COMPLETADA',
      },
    });

    const totalCompras = compras.length;
    const montoTotal = compras.reduce((total, compra) => {
      return total + Number(compra.total);
    }, 0);

    return {
      totalCompras,
      montoTotal,
      compras,
      esElegible: totalCompras >= 1 && montoTotal > 0,
    };
  }

  /**
   * Valida la capacidad de canje de puntos
   */
  async validateCanjePoints(
    clienteId: number,
    puntosACanjear: number,
  ): Promise<{
    fidelizacion: any;
    puedeCanjar: boolean;
    puntosDisponibles: number;
  }> {
    const fidelizacion = await this.validateFidelizacionExists(clienteId);

    const puntosDisponibles = fidelizacion.puntos_actuales;
    const puedeCanjar = puntosDisponibles >= puntosACanjear;

    if (!puedeCanjar) {
      throw new BadRequestException(
        `Puntos insuficientes. Disponibles: ${puntosDisponibles}, Solicitados: ${puntosACanjear}`,
      );
    }

    return {
      fidelizacion,
      puedeCanjar,
      puntosDisponibles,
    };
  }

  /**
   * Valida los parámetros de paginación
   */
  validatePaginationParams(
    page?: number,
    limit?: number,
  ): { page: number; limit: number } {
    const validatedPage = page && page > 0 ? page : 1;
    const validatedLimit = limit && limit > 0 && limit <= 100 ? limit : 10;

    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Valida permisos de gestión de fidelización (contexto peruano)
   */
  async validateGestionPermissions(
    empresaId: number,
    usuarioId: number,
  ): Promise<void> {
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
    });

    if (!usuarioEmpresa) {
      throw new NotFoundException('Usuario no tiene acceso a esta empresa');
    }

    // Verificar si es dueño de la empresa (tiene permisos completos)
    if (!usuarioEmpresa.es_dueno) {
      throw new BadRequestException(
        'No tiene permisos para gestionar programas de fidelización',
      );
    }
  }

  /**
   * Valida cumplimiento de normativas peruanas para programas de fidelización
   */
  validateCumplimientoNormativo(createDto: CreateFidelizacionDto): void {
    // Validar transparencia en términos y condiciones
    if (!createDto.descripcion || createDto.descripcion.length < 50) {
      throw new BadRequestException(
        'La descripción del programa debe ser clara y detallada (mínimo 50 caracteres) según normativas de protección al consumidor',
      );
    }

    // Validar valor mínimo de punto según regulaciones
    if (createDto.valorPunto && createDto.valorPunto < 0.01) {
      throw new BadRequestException(
        'El valor del punto debe ser al menos S/. 0.01 según normativas monetarias',
      );
    }

    // Validar porcentaje de puntos por compra
    if (createDto.puntosPorCompra && createDto.puntosPorCompra > 50) {
      throw new BadRequestException(
        'El porcentaje de puntos por compra no puede exceder el 50% para evitar prácticas comerciales desleales',
      );
    }

    // Validar duración mínima del programa
    if (createDto.fechaInicio && createDto.fechaExpiracion) {
      const fechaInicio = new Date(createDto.fechaInicio);
      const fechaExpiracion = new Date(createDto.fechaExpiracion);
      const duracionMeses =
        (fechaExpiracion.getTime() - fechaInicio.getTime()) /
        (1000 * 60 * 60 * 24 * 30);

      if (duracionMeses < 3) {
        throw new BadRequestException(
          'El programa de fidelización debe tener una duración mínima de 3 meses según normativas de protección al consumidor',
        );
      }
    }
  }

  /**
   * Valida información sensible en datos de fidelización
   */
  validateInformacionSensible(data: any): void {
    const camposSensibles = ['dni', 'ruc', 'tarjeta', 'cuenta', 'password'];
    const texto = JSON.stringify(data).toLowerCase();

    for (const campo of camposSensibles) {
      if (texto.includes(campo)) {
        throw new BadRequestException(
          `No se permite incluir información sensible (${campo}) en los datos de fidelización`,
        );
      }
    }
  }

  /**
   * Valida parámetros de búsqueda
   */
  validateSearchParams(searchParams: any): void {
    if (searchParams.puntosMinimos && searchParams.puntosMinimos < 0) {
      throw new BadRequestException(
        'Los puntos mínimos no pueden ser negativos',
      );
    }

    if (searchParams.puntosMaximos && searchParams.puntosMaximos < 0) {
      throw new BadRequestException(
        'Los puntos máximos no pueden ser negativos',
      );
    }

    if (
      searchParams.puntosMinimos &&
      searchParams.puntosMaximos &&
      searchParams.puntosMinimos > searchParams.puntosMaximos
    ) {
      throw new BadRequestException(
        'Los puntos mínimos no pueden ser mayores que los máximos',
      );
    }

    if (
      searchParams.fechaInicio &&
      searchParams.fechaFin &&
      new Date(searchParams.fechaInicio) > new Date(searchParams.fechaFin)
    ) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser posterior a la fecha fin',
      );
    }

    if (searchParams.nivel) {
      this.validateNivel(searchParams.nivel);
    }
  }
}
