import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSuscripcionDto } from '../dto/create-suscripcion.dto';
import { UpdateSuscripcionDto } from '../dto/update-suscripcion.dto';
import { CreatePagoSuscripcionDto } from '../dto/create-pago-suscripcion.dto';
import {
  PlanSuscripcion,
  EstadoSuscripcion,
  PLANES_CONFIG,
} from '../../common/enums/estados.enum';

@Injectable()
export class SuscripcionesService {
  private readonly logger = new Logger(SuscripcionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createSuscripcionDto: CreateSuscripcionDto) {
    try {
      // Verificar que la empresa no tenga ya una suscripción activa
      const suscripcionExistente =
        await this.prisma.suscripcionEmpresa.findUnique({
          where: { id_empresa: createSuscripcionDto.id_empresa },
        });

      if (suscripcionExistente) {
        throw new BadRequestException(
          'La empresa ya tiene una suscripción activa',
        );
      }

      // Obtener configuración del plan
      const planConfig = PLANES_CONFIG[createSuscripcionDto.plan];

      // Calcular fecha de fin según el plan
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + planConfig.duracion_dias);

      return await this.prisma.suscripcionEmpresa.create({
        data: {
          id_empresa: createSuscripcionDto.id_empresa,
          plan: createSuscripcionDto.plan,
          estado: createSuscripcionDto.estado || EstadoSuscripcion.TRIAL,
          fecha_fin: createSuscripcionDto.fecha_fin
            ? new Date(createSuscripcionDto.fecha_fin)
            : fechaFin,
          limite_clientes:
            createSuscripcionDto.limite_clientes || planConfig.limite_clientes,
          limite_productos:
            createSuscripcionDto.limite_productos ||
            planConfig.limite_productos,
          limite_usuarios:
            createSuscripcionDto.limite_usuarios || planConfig.limite_usuarios,
          limite_mensajes:
            createSuscripcionDto.limite_mensajes || planConfig.limite_mensajes,
          precio_mensual:
            createSuscripcionDto.precio_mensual || planConfig.precio,
          fecha_proximo_pago: createSuscripcionDto.fecha_proximo_pago
            ? new Date(createSuscripcionDto.fecha_proximo_pago)
            : null,
          activa: createSuscripcionDto.activa ?? true,
        },
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
              ruc: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear suscripción: ${error.message}`);
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una suscripción para esta empresa',
        );
      }
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    plan?: PlanSuscripcion,
    estado?: EstadoSuscripcion,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (plan) where.plan = plan;
    if (estado) where.estado = estado;

    const [suscripciones, total] = await Promise.all([
      this.prisma.suscripcionEmpresa.findMany({
        skip,
        take: limit,
        where,
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
              ruc: true,
              telefono: true,
            },
          },
          pagos_suscripcion: {
            orderBy: { fecha_pago: 'desc' },
            take: 1,
          },
        },
        orderBy: {
          fecha_creacion: 'desc',
        },
      }),
      this.prisma.suscripcionEmpresa.count({ where }),
    ]);

    return {
      data: suscripciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const suscripcion = await this.prisma.suscripcionEmpresa.findUnique({
      where: { id_suscripcion: id },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
            telefono: true,
          },
        },
        pagos_suscripcion: {
          orderBy: { fecha_pago: 'desc' },
        },
      },
    });

    if (!suscripcion) {
      throw new NotFoundException(`Suscripción con ID ${id} no encontrada`);
    }

    return suscripcion;
  }

  async findByEmpresa(empresaId: number) {
    const suscripcion = await this.prisma.suscripcionEmpresa.findUnique({
      where: { id_empresa: empresaId },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
          },
        },
        pagos_suscripcion: {
          orderBy: { fecha_pago: 'desc' },
          take: 5,
        },
      },
    });

    if (!suscripcion) {
      throw new NotFoundException(
        `No se encontró suscripción para la empresa ${empresaId}`,
      );
    }

    return suscripcion;
  }

  async update(id: number, updateSuscripcionDto: UpdateSuscripcionDto) {
    try {
      return await this.prisma.suscripcionEmpresa.update({
        where: { id_suscripcion: id },
        data: {
          ...updateSuscripcionDto,
          fecha_fin: updateSuscripcionDto.fecha_fin
            ? new Date(updateSuscripcionDto.fecha_fin)
            : undefined,
          fecha_proximo_pago: updateSuscripcionDto.fecha_proximo_pago
            ? new Date(updateSuscripcionDto.fecha_proximo_pago)
            : undefined,
        },
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
              ruc: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Suscripción con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  async cambiarPlan(id: number, nuevoPlan: PlanSuscripcion) {
    const planConfig = PLANES_CONFIG[nuevoPlan];

    try {
      return await this.prisma.suscripcionEmpresa.update({
        where: { id_suscripcion: id },
        data: {
          plan: nuevoPlan,
          limite_clientes: planConfig.limite_clientes,
          limite_productos: planConfig.limite_productos,
          limite_usuarios: planConfig.limite_usuarios,
          limite_mensajes: planConfig.limite_mensajes,
          precio_mensual: planConfig.precio,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Suscripción con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  async suspender(id: number) {
    return this.update(id, {
      estado: EstadoSuscripcion.SUSPENDIDA,
      activa: false,
    });
  }

  async reactivar(id: number) {
    return this.update(id, {
      estado: EstadoSuscripcion.ACTIVA,
      activa: true,
    });
  }

  async remove(id: number) {
    try {
      await this.prisma.suscripcionEmpresa.delete({
        where: { id_suscripcion: id },
      });
      return { message: 'Suscripción eliminada correctamente' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Suscripción con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  // Métodos para gestionar pagos
  async createPago(createPagoDto: CreatePagoSuscripcionDto) {
    try {
      return await this.prisma.pagoSuscripcion.create({
        data: {
          id_suscripcion: createPagoDto.id_suscripcion,
          monto: createPagoDto.monto,
          metodo_pago: createPagoDto.metodo_pago,
          estado_pago: createPagoDto.estado_pago,
          referencia_externa: createPagoDto.referencia_externa,
          periodo_inicio: new Date(createPagoDto.periodo_inicio),
          periodo_fin: new Date(createPagoDto.periodo_fin),
          comprobante_url: createPagoDto.comprobante_url,
          notas: createPagoDto.notas,
        },
        include: {
          suscripcion: {
            include: {
              empresa: {
                select: {
                  id_empresa: true,
                  nombre: true,
                  ruc: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear pago: ${error.message}`);
      throw error;
    }
  }

  async findPagosBySuscripcion(suscripcionId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [pagos, total] = await Promise.all([
      this.prisma.pagoSuscripcion.findMany({
        skip,
        take: limit,
        where: { id_suscripcion: suscripcionId },
        orderBy: { fecha_pago: 'desc' },
      }),
      this.prisma.pagoSuscripcion.count({
        where: { id_suscripcion: suscripcionId },
      }),
    ]);

    return {
      data: pagos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async verificarLimites(empresaId: number) {
    const suscripcion = await this.findByEmpresa(empresaId);

    // Obtener conteos actuales
    const [clientesCount, productosCount, usuariosCount] = await Promise.all([
      this.prisma.clienteEmpresa.count({ where: { empresa_id: empresaId } }),
      this.prisma.productoServicio.count({ where: { id_empresa: empresaId } }),
      this.prisma.usuarioEmpresa.count({ where: { empresa_id: empresaId } }),
    ]);

    return {
      clientes: {
        actual: clientesCount,
        limite: suscripcion.limite_clientes,
        disponible:
          suscripcion.limite_clientes === -1
            ? -1
            : suscripcion.limite_clientes - clientesCount,
      },
      productos: {
        actual: productosCount,
        limite: suscripcion.limite_productos,
        disponible:
          suscripcion.limite_productos === -1
            ? -1
            : suscripcion.limite_productos - productosCount,
      },
      usuarios: {
        actual: usuariosCount,
        limite: suscripcion.limite_usuarios,
        disponible:
          suscripcion.limite_usuarios === -1
            ? -1
            : suscripcion.limite_usuarios - usuariosCount,
      },
    };
  }
}
