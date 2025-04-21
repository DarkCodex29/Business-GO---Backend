import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateValoracionDto } from '../dto/create-valoracion.dto';
import { UpdateValoracionDto } from '../dto/update-valoracion.dto';
import { PaginationDto } from '../dto/pagination.dto';
import {
  ModerarValoracionDto,
  EstadoModeracion,
} from '../dto/moderar-valoracion.dto';

@Injectable()
export class ValoracionesService {
  private readonly logger = new Logger(ValoracionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createValoracionDto: CreateValoracionDto) {
    this.logger.log(`Creando valoración para empresa ${empresaId}`);

    try {
      // Verificar que el cliente existe y pertenece a la empresa
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          id_cliente: createValoracionDto.id_cliente,
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
          `Cliente ${createValoracionDto.id_cliente} no encontrado o no pertenece a la empresa ${empresaId}`,
        );
        throw new NotFoundException(
          `Cliente con ID ${createValoracionDto.id_cliente} no encontrado o no pertenece a la empresa`,
        );
      }

      // Verificar que el producto existe y pertenece a la empresa
      const producto = await this.prisma.productoServicio.findFirst({
        where: {
          id_producto: createValoracionDto.id_producto,
          id_empresa: empresaId,
        },
      });

      if (!producto) {
        this.logger.warn(
          `Producto ${createValoracionDto.id_producto} no encontrado o no pertenece a la empresa ${empresaId}`,
        );
        throw new NotFoundException(
          `Producto con ID ${createValoracionDto.id_producto} no encontrado o no pertenece a la empresa`,
        );
      }

      // Verificar si el cliente ya ha valorado este producto
      const valoracionExistente = await this.prisma.valoracion.findFirst({
        where: {
          id_cliente: createValoracionDto.id_cliente,
          id_producto: createValoracionDto.id_producto,
        },
      });

      if (valoracionExistente) {
        this.logger.warn(
          `Cliente ${createValoracionDto.id_cliente} ya ha valorado el producto ${createValoracionDto.id_producto}`,
        );
        throw new BadRequestException(
          'El cliente ya ha valorado este producto',
        );
      }

      const valoracion = await this.prisma.valoracion.create({
        data: {
          ...createValoracionDto,
          puntuacion: createValoracionDto.calificacion,
          estado_moderacion: EstadoModeracion.PENDIENTE,
        },
        include: {
          cliente: true,
          producto: true,
        },
      });

      this.logger.log(`Valoración creada con ID ${valoracion.id_valoracion}`);
      return valoracion;
    } catch (error) {
      this.logger.error(
        `Error al crear valoración: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(empresaId: number, paginationDto: PaginationDto) {
    this.logger.log(
      `Obteniendo valoraciones para empresa ${empresaId} con paginación`,
    );

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    try {
      const [valoraciones, total] = await Promise.all([
        this.prisma.valoracion.findMany({
          where: {
            producto: {
              id_empresa: empresaId,
            },
          },
          include: {
            cliente: true,
            producto: true,
          },
          orderBy: {
            id_valoracion: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.valoracion.count({
          where: {
            producto: {
              id_empresa: empresaId,
            },
          },
        }),
      ]);

      return {
        data: valoraciones,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener valoraciones: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOne(id: number, empresaId: number) {
    this.logger.log(`Obteniendo valoración ${id} para empresa ${empresaId}`);

    try {
      const valoracion = await this.prisma.valoracion.findFirst({
        where: {
          id_valoracion: id,
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
          `Valoración ${id} no encontrada para empresa ${empresaId}`,
        );
        throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
      }

      return valoracion;
    } catch (error) {
      this.logger.error(
        `Error al obtener valoración: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: number,
    empresaId: number,
    updateValoracionDto: UpdateValoracionDto,
  ) {
    this.logger.log(`Actualizando valoración ${id} para empresa ${empresaId}`);

    try {
      // Verificar que la valoración existe y pertenece a un producto de la empresa
      const valoracion = await this.prisma.valoracion.findFirst({
        where: {
          id_valoracion: id,
          producto: {
            id_empresa: empresaId,
          },
        },
      });

      if (!valoracion) {
        this.logger.warn(
          `Valoración ${id} no encontrada para empresa ${empresaId}`,
        );
        throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
      }

      const updatedValoracion = await this.prisma.valoracion.update({
        where: {
          id_valoracion: id,
        },
        data: {
          ...updateValoracionDto,
          puntuacion: updateValoracionDto.calificacion,
        },
        include: {
          cliente: true,
          producto: true,
        },
      });

      this.logger.log(`Valoración ${id} actualizada correctamente`);
      return updatedValoracion;
    } catch (error) {
      this.logger.error(
        `Error al actualizar valoración: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: number, empresaId: number) {
    this.logger.log(`Eliminando valoración ${id} para empresa ${empresaId}`);

    try {
      // Verificar que la valoración existe y pertenece a un producto de la empresa
      const valoracion = await this.prisma.valoracion.findFirst({
        where: {
          id_valoracion: id,
          producto: {
            id_empresa: empresaId,
          },
        },
      });

      if (!valoracion) {
        this.logger.warn(
          `Valoración ${id} no encontrada para empresa ${empresaId}`,
        );
        throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
      }

      await this.prisma.valoracion.delete({
        where: {
          id_valoracion: id,
        },
      });

      this.logger.log(`Valoración ${id} eliminada correctamente`);
      return { message: 'Valoración eliminada correctamente' };
    } catch (error) {
      this.logger.error(
        `Error al eliminar valoración: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByProducto(
    productoId: number,
    empresaId: number,
    paginationDto: PaginationDto,
  ) {
    this.logger.log(
      `Obteniendo valoraciones para producto ${productoId} de empresa ${empresaId}`,
    );

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    try {
      // Verificar que el producto existe y pertenece a la empresa
      const producto = await this.prisma.productoServicio.findFirst({
        where: {
          id_producto: productoId,
          id_empresa: empresaId,
        },
      });

      if (!producto) {
        this.logger.warn(
          `Producto ${productoId} no encontrado para empresa ${empresaId}`,
        );
        throw new NotFoundException(
          `Producto con ID ${productoId} no encontrado`,
        );
      }

      const [valoraciones, total] = await Promise.all([
        this.prisma.valoracion.findMany({
          where: {
            id_producto: productoId,
          },
          include: {
            cliente: true,
            producto: true,
          },
          orderBy: {
            id_valoracion: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.valoracion.count({
          where: {
            id_producto: productoId,
          },
        }),
      ]);

      // Calcular estadísticas
      const estadisticas = await this.calcularEstadisticasProducto(productoId);

      return {
        data: valoraciones,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        estadisticas,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener valoraciones por producto: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByCliente(
    clienteId: number,
    empresaId: number,
    paginationDto: PaginationDto,
  ) {
    this.logger.log(
      `Obteniendo valoraciones para cliente ${clienteId} de empresa ${empresaId}`,
    );

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    try {
      // Verificar que el cliente existe y pertenece a la empresa
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
          `Cliente ${clienteId} no encontrado para empresa ${empresaId}`,
        );
        throw new NotFoundException(
          `Cliente con ID ${clienteId} no encontrado`,
        );
      }

      const [valoraciones, total] = await Promise.all([
        this.prisma.valoracion.findMany({
          where: {
            id_cliente: clienteId,
            producto: {
              id_empresa: empresaId,
            },
          },
          include: {
            cliente: true,
            producto: true,
          },
          orderBy: {
            id_valoracion: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.valoracion.count({
          where: {
            id_cliente: clienteId,
            producto: {
              id_empresa: empresaId,
            },
          },
        }),
      ]);

      return {
        data: valoraciones,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener valoraciones por cliente: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async calcularEstadisticasProducto(productoId: number) {
    const valoraciones = await this.prisma.valoracion.findMany({
      where: {
        id_producto: productoId,
      },
      select: {
        puntuacion: true,
      },
    });

    if (valoraciones.length === 0) {
      return {
        promedio: 0,
        total: 0,
        distribucion: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
    }

    const suma = valoraciones.reduce((acc, val) => acc + val.puntuacion, 0);
    const promedio = suma / valoraciones.length;

    const distribucion = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    valoraciones.forEach((val) => {
      distribucion[val.puntuacion] = (distribucion[val.puntuacion] ?? 0) + 1;
    });

    return {
      promedio,
      total: valoraciones.length,
      distribucion,
    };
  }

  async moderarValoracion(
    id: number,
    empresaId: number,
    moderarValoracionDto: ModerarValoracionDto,
  ) {
    this.logger.log(`Moderando valoración ${id} para empresa ${empresaId}`);

    try {
      // Verificar que la valoración existe y pertenece a un producto de la empresa
      const valoracion = await this.prisma.valoracion.findFirst({
        where: {
          id_valoracion: id,
          producto: {
            id_empresa: empresaId,
          },
        },
      });

      if (!valoracion) {
        this.logger.warn(
          `Valoración ${id} no encontrada para empresa ${empresaId}`,
        );
        throw new NotFoundException(`Valoración con ID ${id} no encontrada`);
      }

      const valoracionModerada = await this.prisma.valoracion.update({
        where: {
          id_valoracion: id,
        },
        data: {
          estado_moderacion: moderarValoracionDto.estado,
          comentario_moderador: moderarValoracionDto.comentario_moderador,
        },
        include: {
          cliente: true,
          producto: true,
        },
      });

      this.logger.log(
        `Valoración ${id} moderada con estado: ${moderarValoracionDto.estado}`,
      );
      return valoracionModerada;
    } catch (error) {
      this.logger.error(
        `Error al moderar valoración: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
