import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';
import {
  ModerarValoracionDto,
  EstadoModeracion,
} from '../dto/moderar-valoracion.dto';
import { ValoracionesValidationService } from './valoraciones-validation.service';
import { ValoracionesCalculationService } from './valoraciones-calculation.service';

export interface ValoracionFormatted {
  id_valoracion: number;
  puntuacion: number;
  comentario: string;
  estado_moderacion: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  cliente: {
    id_cliente: number;
    nombre_completo: string;
    email: string;
  };
  producto: {
    id_producto: number;
    nombre: string;
    categoria: string;
  };
  moderacion: {
    comentario_moderador?: string;
    fecha_moderacion?: Date;
  };
  contexto_peruano: {
    es_compra_verificada: boolean;
    cumple_politicas_consumidor: boolean;
    nivel_confianza: 'ALTO' | 'MEDIO' | 'BAJO';
  };
}

export interface PaginatedValoraciones {
  data: ValoracionFormatted[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  estadisticas: {
    promedio_calificacion: number;
    total_valoraciones: number;
    distribucion_calificaciones: any;
  };
}

@Injectable()
export abstract class BaseValoracionesService {
  protected readonly logger = new Logger(BaseValoracionesService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: ValoracionesValidationService,
    protected readonly calculationService: ValoracionesCalculationService,
  ) {}

  // Métodos principales del Template Method Pattern

  async createValoracion(
    createValoracionDto: CreateValoracionDto,
    empresaId: number,
  ): Promise<ValoracionFormatted> {
    this.logger.log(`Creando valoración para empresa ${empresaId}`);

    // Validaciones
    await this.validateCreateValoracion(createValoracionDto, empresaId);

    // Preparar datos
    const valoracionData =
      await this.prepareValoracionData(createValoracionDto);

    // Ejecutar creación
    const valoracion = await this.executeCreateValoracion(valoracionData);

    // Post-procesamiento
    await this.postCreateValoracion(valoracion, empresaId);

    // Formatear respuesta
    return await this.formatValoracionResponse(
      valoracion.id_valoracion,
      empresaId,
    );
  }

  async getValoraciones(
    empresaId: number,
    page: number = 1,
    limit: number = 10,
    filters: any = {},
  ): Promise<PaginatedValoraciones> {
    this.logger.log(`Obteniendo valoraciones para empresa ${empresaId}`);

    // Construir filtros
    const whereClause = await this.buildWhereClause(empresaId, filters);

    // Ejecutar consultas
    const [valoraciones, total] = await Promise.all([
      this.executeGetValoraciones(whereClause, page, limit),
      this.executeCountValoraciones(whereClause),
    ]);

    // Formatear datos
    const formattedValoraciones = await Promise.all(
      valoraciones.map((v) =>
        this.formatValoracionResponse(v.id_valoracion, empresaId),
      ),
    );

    // Calcular estadísticas
    const estadisticas = await this.calculatePageStatistics(valoraciones);

    return {
      data: formattedValoraciones,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      estadisticas,
    };
  }

  async moderarValoracion(
    valoracionId: number,
    moderarDto: ModerarValoracionDto,
    empresaId: number,
  ): Promise<ValoracionFormatted> {
    this.logger.log(`Moderando valoración ${valoracionId}`);

    // Validaciones
    await this.validationService.validateValoracionExists(
      valoracionId,
      empresaId,
    );
    this.validationService.validateModerationData(moderarDto);

    // Preparar datos de moderación
    const moderationData = await this.prepareModerationData(moderarDto);

    // Ejecutar moderación
    const valoracion = await this.executeModerarValoracion(
      valoracionId,
      moderationData,
    );

    // Post-procesamiento
    await this.postModerarValoracion(valoracion, empresaId);

    // Formatear respuesta
    return await this.formatValoracionResponse(valoracionId, empresaId);
  }

  async updateValoracion(
    valoracionId: number,
    updateDto: UpdateValoracionDto,
    empresaId: number,
  ): Promise<ValoracionFormatted> {
    this.logger.log(`Actualizando valoración ${valoracionId}`);

    // Validaciones
    await this.validationService.validateValoracionExists(
      valoracionId,
      empresaId,
    );
    this.validationService.validateUpdateData(updateDto);

    // Preparar datos de actualización
    const updateData = await this.prepareUpdateData(updateDto);

    // Ejecutar actualización
    const valoracion = await this.executeUpdateValoracion(
      valoracionId,
      updateData,
    );

    // Post-procesamiento
    await this.postUpdateValoracion(valoracion, empresaId);

    // Formatear respuesta
    return await this.formatValoracionResponse(valoracionId, empresaId);
  }

  async deleteValoracion(
    valoracionId: number,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(`Eliminando valoración ${valoracionId}`);

    // Validaciones
    const valoracion = await this.validationService.validateValoracionExists(
      valoracionId,
      empresaId,
    );

    // Pre-procesamiento
    await this.preDeleteValoracion(valoracion, empresaId);

    // Ejecutar eliminación
    await this.executeDeleteValoracion(valoracionId);

    // Post-procesamiento
    await this.postDeleteValoracion(valoracion, empresaId);
  }

  // Métodos de validación

  protected async validateCreateValoracion(
    createDto: CreateValoracionDto,
    empresaId: number,
  ): Promise<void> {
    // Validar datos básicos
    this.validationService.validateCreateData(createDto);

    // Validar relaciones
    await Promise.all([
      this.validationService.validateClienteEmpresa(
        createDto.id_cliente,
        empresaId,
      ),
      this.validationService.validateProductoEmpresa(
        createDto.id_producto,
        empresaId,
      ),
      this.validationService.validateValoracionUnica(
        createDto.id_cliente,
        createDto.id_producto,
      ),
    ]);
  }

  // Métodos de preparación de datos

  protected async prepareValoracionData(
    createDto: CreateValoracionDto,
  ): Promise<any> {
    return {
      puntuacion: createDto.puntuacion,
      comentario: createDto.comentario || null,
      id_cliente: createDto.id_cliente,
      id_producto: createDto.id_producto,
      estado_moderacion: 'PENDIENTE',
    };
  }

  protected async prepareModerationData(
    moderarDto: ModerarValoracionDto,
  ): Promise<any> {
    return {
      estado_moderacion: moderarDto.estado,
      comentario_moderador: moderarDto.comentario_moderador || null,
    };
  }

  protected async prepareUpdateData(
    updateDto: UpdateValoracionDto,
  ): Promise<any> {
    const updateData: any = {};

    if (updateDto.puntuacion !== undefined) {
      updateData.puntuacion = updateDto.puntuacion;
    }

    if (updateDto.comentario !== undefined) {
      updateData.comentario = updateDto.comentario;
    }

    return updateData;
  }

  // Métodos de ejecución

  protected async executeCreateValoracion(valoracionData: any): Promise<any> {
    return await this.prisma.valoracion.create({
      data: valoracionData,
    });
  }

  protected async executeGetValoraciones(
    whereClause: any,
    page: number,
    limit: number,
  ): Promise<any[]> {
    return await this.prisma.valoracion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        producto: {
          include: {
            categoria: true,
          },
        },
      },
      orderBy: {
        id_valoracion: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  protected async executeCountValoraciones(whereClause: any): Promise<number> {
    return await this.prisma.valoracion.count({
      where: whereClause,
    });
  }

  protected async executeModerarValoracion(
    valoracionId: number,
    moderationData: any,
  ): Promise<any> {
    return await this.prisma.valoracion.update({
      where: { id_valoracion: valoracionId },
      data: moderationData,
    });
  }

  protected async executeUpdateValoracion(
    valoracionId: number,
    updateData: any,
  ): Promise<any> {
    return await this.prisma.valoracion.update({
      where: { id_valoracion: valoracionId },
      data: updateData,
    });
  }

  protected async executeDeleteValoracion(valoracionId: number): Promise<void> {
    await this.prisma.valoracion.delete({
      where: { id_valoracion: valoracionId },
    });
  }

  // Métodos de construcción de queries

  protected async buildWhereClause(
    empresaId: number,
    filters: any,
  ): Promise<any> {
    const whereClause: any = {
      producto: {
        id_empresa: empresaId,
      },
    };

    if (filters.puntuacion_minima) {
      whereClause.puntuacion = {
        ...whereClause.puntuacion,
        gte: filters.puntuacion_minima,
      };
    }

    if (filters.puntuacion_maxima) {
      whereClause.puntuacion = {
        ...whereClause.puntuacion,
        lte: filters.puntuacion_maxima,
      };
    }

    if (filters.estado_moderacion) {
      whereClause.estado_moderacion = filters.estado_moderacion;
    }

    if (filters.id_producto) {
      whereClause.id_producto = filters.id_producto;
    }

    if (filters.id_cliente) {
      whereClause.id_cliente = filters.id_cliente;
    }

    if (filters.buscar_comentario) {
      whereClause.comentario = {
        contains: filters.buscar_comentario,
        mode: 'insensitive',
      };
    }

    return whereClause;
  }

  // Métodos de formateo

  protected async formatValoracionResponse(
    valoracionId: number,
    empresaId: number,
  ): Promise<ValoracionFormatted> {
    const valoracion = await this.prisma.valoracion.findFirst({
      where: {
        id_valoracion: valoracionId,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        cliente: true,
        producto: {
          include: {
            categoria: true,
          },
        },
      },
    });

    if (!valoracion) {
      throw new NotFoundException('Valoración no encontrada');
    }

    // Verificar si es compra verificada
    const esCompraVerificada =
      await this.validationService.validateClienteComproProducto(
        valoracion.id_cliente,
        valoracion.id_producto,
      );

    // Calcular nivel de confianza
    const nivelConfianza = this.calculateNivelConfianza(
      valoracion,
      esCompraVerificada,
    );

    // Simular fechas ya que no existen en el schema
    const fechaCreacion = new Date();
    const fechaActualizacion = new Date();

    return {
      id_valoracion: valoracion.id_valoracion,
      puntuacion: valoracion.puntuacion,
      comentario: valoracion.comentario || '',
      estado_moderacion: valoracion.estado_moderacion,
      fecha_creacion: fechaCreacion,
      fecha_actualizacion: fechaActualizacion,
      cliente: {
        id_cliente: valoracion.cliente.id_cliente,
        nombre_completo: valoracion.cliente.nombre, // Solo nombre, sin apellido
        email: valoracion.cliente.email,
      },
      producto: {
        id_producto: valoracion.producto.id_producto,
        nombre: valoracion.producto.nombre,
        categoria: valoracion.producto.categoria?.nombre || 'Sin categoría',
      },
      moderacion: {
        comentario_moderador: valoracion.comentario_moderador || undefined,
        fecha_moderacion: undefined, // No existe en schema
      },
      contexto_peruano: {
        es_compra_verificada: esCompraVerificada,
        cumple_politicas_consumidor:
          this.validatePoliticasConsumidor(valoracion),
        nivel_confianza: nivelConfianza,
      },
    };
  }

  // Métodos de cálculo

  protected async calculatePageStatistics(valoraciones: any[]): Promise<any> {
    if (valoraciones.length === 0) {
      return {
        promedio_calificacion: 0,
        total_valoraciones: 0,
        distribucion_calificaciones: {
          cinco_estrellas: 0,
          cuatro_estrellas: 0,
          tres_estrellas: 0,
          dos_estrellas: 0,
          una_estrella: 0,
        },
      };
    }

    const totalCalificaciones = valoraciones.reduce(
      (sum, v) => sum + v.puntuacion,
      0,
    );
    const promedioCalificacion = totalCalificaciones / valoraciones.length;

    const distribucion = {
      cinco_estrellas: 0,
      cuatro_estrellas: 0,
      tres_estrellas: 0,
      dos_estrellas: 0,
      una_estrella: 0,
    };

    valoraciones.forEach((v) => {
      switch (v.puntuacion) {
        case 5:
          distribucion.cinco_estrellas++;
          break;
        case 4:
          distribucion.cuatro_estrellas++;
          break;
        case 3:
          distribucion.tres_estrellas++;
          break;
        case 2:
          distribucion.dos_estrellas++;
          break;
        case 1:
          distribucion.una_estrella++;
          break;
      }
    });

    return {
      promedio_calificacion: Number(promedioCalificacion.toFixed(2)),
      total_valoraciones: valoraciones.length,
      distribucion_calificaciones: distribucion,
    };
  }

  // Métodos de utilidad

  protected calculateNivelConfianza(
    valoracion: any,
    esCompraVerificada: boolean,
  ): 'ALTO' | 'MEDIO' | 'BAJO' {
    let puntuacion = 0;

    // Compra verificada suma puntos
    if (esCompraVerificada) puntuacion += 3;

    // Comentario detallado suma puntos
    if (valoracion.comentario && valoracion.comentario.length > 50) {
      puntuacion += 2;
    }

    // Estado de moderación aprobado suma puntos
    if (valoracion.estado_moderacion === 'APROBADO') {
      puntuacion += 2;
    }

    // Calificación extrema (1 o 5) resta puntos si no hay comentario
    if (
      (valoracion.puntuacion === 1 || valoracion.puntuacion === 5) &&
      (!valoracion.comentario || valoracion.comentario.length < 20)
    ) {
      puntuacion -= 1;
    }

    if (puntuacion >= 5) return 'ALTO';
    if (puntuacion >= 3) return 'MEDIO';
    return 'BAJO';
  }

  protected validatePoliticasConsumidor(valoracion: any): boolean {
    // Validaciones específicas para el contexto peruano

    // 1. Verificar que la valoración no sea spam
    if (valoracion.comentario) {
      const palabrasSpam = ['spam', 'fake', 'bot', 'falso'];
      const comentarioLower = valoracion.comentario.toLowerCase();

      for (const palabra of palabrasSpam) {
        if (comentarioLower.includes(palabra)) {
          return false;
        }
      }
    }

    // 2. Verificar que la puntuación esté en rango válido
    if (valoracion.puntuacion < 1 || valoracion.puntuacion > 5) {
      return false;
    }

    // 3. Verificar coherencia entre puntuación y comentario
    if (valoracion.comentario) {
      const comentarioPositivo = /excelente|bueno|recomiendo|satisfecho/i.test(
        valoracion.comentario,
      );
      const comentarioNegativo =
        /malo|terrible|no recomiendo|insatisfecho/i.test(valoracion.comentario);

      if (valoracion.puntuacion >= 4 && comentarioNegativo) return false;
      if (valoracion.puntuacion <= 2 && comentarioPositivo) return false;
    }

    return true;
  }

  // Hooks para extensión

  protected async postCreateValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Valoración ${valoracion.id_valoracion} creada exitosamente`,
    );
    // Hook para implementaciones específicas
  }

  protected async postModerarValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Valoración ${valoracion.id_valoracion} moderada exitosamente`,
    );
    // Hook para implementaciones específicas
  }

  protected async postUpdateValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Valoración ${valoracion.id_valoracion} actualizada exitosamente`,
    );
    // Hook para implementaciones específicas
  }

  protected async postDeleteValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Valoración ${valoracion.id_valoracion} eliminada exitosamente`,
    );
    // Hook para implementaciones específicas
  }

  protected async preDeleteValoracion(
    valoracion: any,
    empresaId: number,
  ): Promise<void> {
    // Hook para validaciones pre-eliminación
    this.logger.log(
      `Preparando eliminación de valoración ${valoracion.id_valoracion}`,
    );
  }
}
