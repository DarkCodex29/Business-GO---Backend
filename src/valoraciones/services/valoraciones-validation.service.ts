import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';
import {
  ModerarValoracionDto,
  EstadoModeracion,
} from '../dto/moderar-valoracion.dto';

@Injectable()
export class ValoracionesValidationService {
  private readonly logger = new Logger(ValoracionesValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida que el cliente existe y pertenece a la empresa
   */
  async validateClienteEmpresa(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: {
            empresa: {
              id_empresa: empresaId,
            },
          },
        },
      },
    });

    if (!cliente) {
      this.logger.warn(
        `Cliente ${clienteId} no encontrado o no pertenece a la empresa ${empresaId}`,
      );
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado o no pertenece a la empresa`,
      );
    }
  }

  /**
   * Valida que el producto existe y pertenece a la empresa
   */
  async validateProductoEmpresa(
    productoId: number,
    empresaId: number,
  ): Promise<void> {
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: productoId,
        id_empresa: empresaId,
      },
    });

    if (!producto) {
      this.logger.warn(
        `Producto ${productoId} no encontrado o no pertenece a la empresa ${empresaId}`,
      );
      throw new NotFoundException(
        `Producto con ID ${productoId} no encontrado o no pertenece a la empresa`,
      );
    }
  }

  /**
   * Valida que el cliente no haya valorado ya este producto
   */
  async validateValoracionUnica(
    clienteId: number,
    productoId: number,
  ): Promise<void> {
    const valoracionExistente = await this.prisma.valoracion.findFirst({
      where: {
        id_cliente: clienteId,
        id_producto: productoId,
      },
    });

    if (valoracionExistente) {
      this.logger.warn(
        `Cliente ${clienteId} ya ha valorado el producto ${productoId}`,
      );
      throw new BadRequestException('El cliente ya ha valorado este producto');
    }
  }

  /**
   * Valida que la valoración existe y pertenece a la empresa
   */
  async validateValoracionExists(
    valoracionId: number,
    empresaId: number,
  ): Promise<any> {
    const valoracion = await this.prisma.valoracion.findFirst({
      where: {
        id_valoracion: valoracionId,
        producto: {
          id_empresa: empresaId,
        },
      },
      include: {
        cliente: true,
        producto: true,
      },
    });

    if (!valoracion) {
      this.logger.warn(
        `Valoración ${valoracionId} no encontrada para empresa ${empresaId}`,
      );
      throw new NotFoundException(
        `Valoración con ID ${valoracionId} no encontrada`,
      );
    }

    return valoracion;
  }

  /**
   * Valida los datos de creación de valoración
   */
  validateCreateData(createValoracionDto: CreateValoracionDto): void {
    // Validar puntuación
    if (
      createValoracionDto.puntuacion < 1 ||
      createValoracionDto.puntuacion > 5
    ) {
      throw new BadRequestException('La puntuación debe estar entre 1 y 5');
    }

    // Validar comentario si existe
    if (
      createValoracionDto.comentario &&
      createValoracionDto.comentario.length > 500
    ) {
      throw new BadRequestException(
        'El comentario no puede exceder 500 caracteres',
      );
    }

    // Validar que no contenga contenido inapropiado (básico)
    if (createValoracionDto.comentario) {
      const palabrasProhibidas = ['spam', 'fake', 'falso', 'mentira', 'estafa'];
      const comentarioLower = createValoracionDto.comentario.toLowerCase();

      for (const palabra of palabrasProhibidas) {
        if (comentarioLower.includes(palabra)) {
          throw new BadRequestException(
            'El comentario contiene contenido inapropiado',
          );
        }
      }
    }
  }

  /**
   * Valida los datos de actualización de valoración
   */
  validateUpdateData(updateDto: UpdateValoracionDto): void {
    // Validar puntuación si se proporciona
    if (updateDto.puntuacion !== undefined) {
      if (updateDto.puntuacion < 1 || updateDto.puntuacion > 5) {
        throw new BadRequestException('La puntuación debe estar entre 1 y 5');
      }
    }

    // Validar comentario si se proporciona
    if (updateDto.comentario !== undefined) {
      if (updateDto.comentario && updateDto.comentario.length > 500) {
        throw new BadRequestException(
          'El comentario no puede exceder 500 caracteres',
        );
      }

      // Validar contenido inapropiado
      if (updateDto.comentario) {
        const palabrasProhibidas = [
          'spam',
          'fake',
          'falso',
          'mentira',
          'estafa',
        ];
        const comentarioLower = updateDto.comentario.toLowerCase();

        for (const palabra of palabrasProhibidas) {
          if (comentarioLower.includes(palabra)) {
            throw new BadRequestException(
              'El comentario contiene contenido inapropiado',
            );
          }
        }
      }
    }
  }

  /**
   * Valida los datos de moderación
   */
  validateModerationData(moderarDto: ModerarValoracionDto): void {
    // Validar estado de moderación
    const estadosValidos = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
    if (!estadosValidos.includes(moderarDto.estado)) {
      throw new BadRequestException(
        `Estado de moderación inválido. Debe ser uno de: ${estadosValidos.join(', ')}`,
      );
    }

    // Validar comentario del moderador si se proporciona
    if (
      moderarDto.comentario_moderador &&
      moderarDto.comentario_moderador.length > 500
    ) {
      throw new BadRequestException(
        'El comentario del moderador no puede exceder 500 caracteres',
      );
    }
  }

  /**
   * Valida que la valoración puede ser moderada
   */
  validateModerationPermission(
    valoracion: any,
    nuevoEstado: EstadoModeracion,
  ): void {
    // No se puede moderar una valoración ya moderada a menos que sea para cambiar el estado
    if (
      valoracion.estado_moderacion !== 'PENDIENTE' &&
      valoracion.estado_moderacion === nuevoEstado
    ) {
      throw new BadRequestException(
        `La valoración ya está en estado ${nuevoEstado}`,
      );
    }
  }

  /**
   * Valida parámetros de paginación
   */
  validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new BadRequestException('La página debe ser mayor a 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100');
    }
  }

  /**
   * Valida filtros de búsqueda específicos para contexto peruano
   */
  validateSearchFilters(filters: any): void {
    // Validar puntuación mínima
    if (filters.puntuacion_minima && filters.puntuacion_minima < 1) {
      throw new BadRequestException('La puntuación mínima debe ser mayor a 0');
    }

    // Validar puntuación máxima
    if (filters.puntuacion_maxima && filters.puntuacion_maxima > 5) {
      throw new BadRequestException(
        'La puntuación máxima debe ser menor o igual a 5',
      );
    }

    // Validar coherencia entre puntuaciones
    if (
      filters.puntuacion_minima &&
      filters.puntuacion_maxima &&
      filters.puntuacion_minima > filters.puntuacion_maxima
    ) {
      throw new BadRequestException(
        'La puntuación mínima no puede ser mayor que la máxima',
      );
    }

    // Validar estado de moderación
    if (filters.estado_moderacion) {
      const estadosValidos = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
      if (!estadosValidos.includes(filters.estado_moderacion)) {
        throw new BadRequestException(
          `Estado de moderación inválido. Debe ser uno de: ${estadosValidos.join(', ')}`,
        );
      }
    }

    // Validar longitud de búsqueda en comentarios
    if (filters.buscar_comentario && filters.buscar_comentario.length < 3) {
      throw new BadRequestException(
        'La búsqueda en comentarios debe tener al menos 3 caracteres',
      );
    }
  }

  /**
   * Valida si el cliente compró el producto (simulado)
   */
  async validateClienteComproProducto(
    clienteId: number,
    productoId: number,
  ): Promise<boolean> {
    try {
      // Buscar en órdenes de venta si el cliente compró el producto
      const compra = await this.prisma.ordenVenta.findFirst({
        where: {
          id_cliente: clienteId,
          items: {
            some: {
              id_producto: productoId,
            },
          },
        },
      });

      return !!compra;
    } catch (error) {
      this.logger.warn(
        `Error al validar compra del cliente ${clienteId} para producto ${productoId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Valida cumplimiento de políticas de protección al consumidor peruano
   */
  validatePoliticasConsumidor(valoracion: any): boolean {
    // Validar que la puntuación esté en rango válido
    if (valoracion.puntuacion < 1 || valoracion.puntuacion > 5) {
      return false;
    }

    // Validar coherencia entre puntuación y comentario
    if (valoracion.comentario) {
      const comentarioPositivo = /excelente|bueno|recomiendo|satisfecho/i.test(
        valoracion.comentario,
      );
      const comentarioNegativo =
        /malo|terrible|no recomiendo|insatisfecho/i.test(valoracion.comentario);

      // Incoherencia: puntuación alta con comentario negativo
      if (valoracion.puntuacion >= 4 && comentarioNegativo) {
        return false;
      }

      // Incoherencia: puntuación baja con comentario positivo
      if (valoracion.puntuacion <= 2 && comentarioPositivo) {
        return false;
      }
    }

    // Validar que no contenga información personal sensible
    if (valoracion.comentario) {
      const comentario = valoracion.comentario.toLowerCase();
      const patronesProhibidos = [
        /\d{8}/, // DNI
        /\d{4}-\d{4}-\d{4}-\d{4}/, // Tarjeta de crédito
        /@\w+\.\w+/, // Email
        /\d{9}/, // Teléfono
      ];

      for (const patron of patronesProhibidos) {
        if (patron.test(comentario)) {
          return false;
        }
      }
    }

    return true;
  }
}
