import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';
import { ComprasValidationService } from './compras-validation.service';

@Injectable()
export class ProveedoresService {
  private readonly logger = new Logger(ProveedoresService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly comprasValidationService: ComprasValidationService,
  ) {}

  async create(empresaId: number, createProveedorDto: CreateProveedorDto) {
    try {
      // Validar empresa
      await this.comprasValidationService.validateEmpresaExists(empresaId);

      // Validar RUC del proveedor
      this.comprasValidationService.validateRucProveedor(
        createProveedorDto.ruc,
      );

      // Verificar que el RUC no esté duplicado en la empresa
      await this.validateRucUnico(createProveedorDto.ruc, empresaId);

      const proveedor = await this.prisma.proveedor.create({
        data: {
          ...createProveedorDto,
          empresa_id: empresaId,
          activo: createProveedorDto.activo ?? true,
        },
        include: {
          empresa: {
            select: { nombre: true },
          },
        },
      });

      this.logger.log(
        `Proveedor creado: ${proveedor.nombre} (RUC: ${proveedor.ruc}) para empresa ${empresaId}`,
      );

      return proveedor;
    } catch (error) {
      this.logger.error(`Error creando proveedor: ${error.message}`);
      throw error;
    }
  }

  async findAll(empresaId: number, includeInactive: boolean = false) {
    await this.comprasValidationService.validateEmpresaExists(empresaId);

    const whereClause: any = {
      empresa_id: empresaId,
    };

    if (!includeInactive) {
      whereClause.activo = true;
    }

    return this.prisma.proveedor.findMany({
      where: whereClause,
      include: {
        ordenes_compra: {
          select: {
            id_orden_compra: true,
            numero_orden: true,
            estado: true,
            total: true,
            fecha_emision: true,
          },
          orderBy: {
            fecha_emision: 'desc',
          },
          take: 5, // Últimas 5 órdenes
        },
        productos: {
          select: {
            id_producto: true,
            precio_compra: true,
            tiempo_entrega: true,
            producto: {
              select: {
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: {
            ordenes_compra: true,
            productos: true,
            cotizaciones: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async findOne(id: number, empresaId?: number) {
    const whereClause: any = { id_proveedor: id };

    if (empresaId) {
      whereClause.empresa_id = empresaId;
    }

    const proveedor = await this.prisma.proveedor.findFirst({
      where: whereClause,
      include: {
        ordenes_compra: {
          include: {
            items: {
              select: {
                cantidad: true,
                precio_unitario: true,
                producto: {
                  select: { nombre: true },
                },
              },
            },
          },
          orderBy: {
            fecha_emision: 'desc',
          },
        },
        productos: {
          include: {
            producto: true,
          },
        },
        cotizaciones: {
          orderBy: {
            fecha_emision: 'desc',
          },
        },
        empresa: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    return proveedor;
  }

  async update(
    id: number,
    empresaId: number,
    updateProveedorDto: UpdateProveedorDto,
  ) {
    try {
      // Validar que el proveedor existe y pertenece a la empresa
      await this.comprasValidationService.validateProveedorEmpresa(
        id,
        empresaId,
      );

      // Si se actualiza el RUC, validarlo
      if (updateProveedorDto.ruc) {
        this.comprasValidationService.validateRucProveedor(
          updateProveedorDto.ruc,
        );
        await this.validateRucUnico(updateProveedorDto.ruc, empresaId, id);
      }

      const proveedorActualizado = await this.prisma.proveedor.update({
        where: { id_proveedor: id },
        data: updateProveedorDto,
        include: {
          empresa: {
            select: { nombre: true },
          },
        },
      });

      this.logger.log(
        `Proveedor actualizado: ${proveedorActualizado.nombre} (ID: ${id})`,
      );

      return proveedorActualizado;
    } catch (error) {
      this.logger.error(`Error actualizando proveedor ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: number, empresaId: number) {
    try {
      // Validar que el proveedor existe y pertenece a la empresa
      await this.comprasValidationService.validateProveedorEmpresa(
        id,
        empresaId,
      );

      // Verificar que no tenga órdenes de compra pendientes
      await this.validateProveedorCanBeDeactivated(id);

      const proveedorDesactivado = await this.prisma.proveedor.update({
        where: { id_proveedor: id },
        data: { activo: false },
        include: {
          empresa: {
            select: { nombre: true },
          },
        },
      });

      this.logger.log(
        `Proveedor desactivado: ${proveedorDesactivado.nombre} (ID: ${id})`,
      );

      return proveedorDesactivado;
    } catch (error) {
      this.logger.error(`Error desactivando proveedor ${id}: ${error.message}`);
      throw error;
    }
  }

  async addProducto(
    id: number,
    productoId: number,
    data: any,
    empresaId: number,
  ) {
    await this.findOne(id);
    return this.prisma.productoProveedor.create({
      data: {
        id_proveedor: id,
        id_producto: productoId,
        ...data,
      },
    });
  }

  async removeProducto(id: number, productoId: number, empresaId: number) {
    try {
      // Validar que el proveedor existe y pertenece a la empresa
      await this.comprasValidationService.validateProveedorEmpresa(
        id,
        empresaId,
      );

      // Validar que el producto existe y pertenece a la empresa
      await this.comprasValidationService.validateProductoEmpresa(
        productoId,
        empresaId,
      );

      const productoEliminado = await this.prisma.productoProveedor.delete({
        where: {
          id_proveedor_id_producto: {
            id_proveedor: id,
            id_producto: productoId,
          },
        },
        include: {
          producto: {
            select: { nombre: true },
          },
          proveedor: {
            select: { nombre: true },
          },
        },
      });

      this.logger.log(
        `Producto ${productoEliminado.producto.nombre} eliminado del proveedor ${productoEliminado.proveedor.nombre}`,
      );

      return productoEliminado;
    } catch (error) {
      this.logger.error(
        `Error eliminando producto del proveedor: ${error.message}`,
      );
      throw error;
    }
  }

  // Método para obtener estadísticas del proveedor
  async getEstadisticasProveedor(id: number, empresaId: number) {
    await this.comprasValidationService.validateProveedorEmpresa(id, empresaId);

    const [ordenesStats, productosCount, montoTotal] = await Promise.all([
      this.prisma.ordenCompra.groupBy({
        by: ['estado'],
        where: {
          id_proveedor: id,
          id_empresa: empresaId,
        },
        _count: {
          estado: true,
        },
        _sum: {
          total: true,
        },
      }),
      this.prisma.productoProveedor.count({
        where: { id_proveedor: id },
      }),
      this.prisma.ordenCompra.aggregate({
        where: {
          id_proveedor: id,
          id_empresa: empresaId,
          estado: 'RECIBIDA',
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    return {
      ordenesPorEstado: ordenesStats,
      totalProductos: productosCount,
      montoTotalCompras: Number(montoTotal._sum.total || 0),
    };
  }

  // Método para reactivar proveedor
  async reactivarProveedor(id: number, empresaId: number) {
    try {
      const proveedor = await this.prisma.proveedor.findFirst({
        where: {
          id_proveedor: id,
          empresa_id: empresaId,
        },
      });

      if (!proveedor) {
        throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
      }

      const proveedorReactivado = await this.prisma.proveedor.update({
        where: { id_proveedor: id },
        data: { activo: true },
        include: {
          empresa: {
            select: { nombre: true },
          },
        },
      });

      this.logger.log(
        `Proveedor reactivado: ${proveedorReactivado.nombre} (ID: ${id})`,
      );

      return proveedorReactivado;
    } catch (error) {
      this.logger.error(`Error reactivando proveedor ${id}: ${error.message}`);
      throw error;
    }
  }

  // Métodos auxiliares privados
  private async validateRucUnico(
    ruc: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = {
      ruc,
      empresa_id: empresaId,
    };

    if (excludeId) {
      whereClause.id_proveedor = { not: excludeId };
    }

    const proveedorExistente = await this.prisma.proveedor.findFirst({
      where: whereClause,
      select: { id_proveedor: true, nombre: true },
    });

    if (proveedorExistente) {
      throw new BadRequestException(
        `Ya existe un proveedor con el RUC ${ruc}: ${proveedorExistente.nombre}`,
      );
    }
  }

  private async validateProveedorCanBeDeactivated(id: number): Promise<void> {
    const ordenesPendientes = await this.prisma.ordenCompra.count({
      where: {
        id_proveedor: id,
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA', 'EN_PROCESO'],
        },
      },
    });

    if (ordenesPendientes > 0) {
      throw new BadRequestException(
        `No se puede desactivar el proveedor porque tiene ${ordenesPendientes} órdenes de compra pendientes`,
      );
    }
  }
}
