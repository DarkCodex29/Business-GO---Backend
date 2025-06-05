import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClienteValidationService } from './cliente-validation.service';

export interface IClienteQuery {
  empresaId: number;
  page?: number;
  limit?: number;
  search?: string;
  tipoCliente?: string;
  activo?: boolean;
}

export interface IClienteResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export abstract class BaseClienteService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly clienteValidationService: ClienteValidationService,
  ) {}

  protected async findClientesByEmpresa(
    query: IClienteQuery,
  ): Promise<IClienteResponse<any>> {
    const {
      empresaId,
      page = 1,
      limit = 10,
      search,
      tipoCliente,
      activo = true,
    } = query;
    const skip = (page - 1) * limit;

    // Construir filtros dinámicos
    const whereClause: any = {
      empresas: {
        some: {
          empresa_id: empresaId,
        },
      },
    };

    if (search) {
      whereClause.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search } },
      ];
    }

    if (tipoCliente) {
      whereClause.tipo_cliente = tipoCliente;
    }

    // Ejecutar consultas en paralelo para optimizar rendimiento
    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: this.getClienteIncludes(),
        orderBy: this.getDefaultOrderBy(),
      }),
      this.prisma.cliente.count({ where: whereClause }),
    ]);

    return {
      data: clientes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  protected async findClienteByEmpresa(empresaId: number, clienteId: number) {
    await this.clienteValidationService.validateClienteEmpresaExists(
      empresaId,
      clienteId,
    );

    return this.prisma.cliente.findUnique({
      where: { id_cliente: clienteId },
      include: this.getClienteIncludes(),
    });
  }

  protected async createClienteTransaction(
    empresaId: number,
    clienteData: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Crear el cliente
      const cliente = await tx.cliente.create({
        data: {
          ...clienteData,
          empresas: {
            create: {
              empresa_id: empresaId,
              fecha_registro: new Date(),
            },
          },
        },
        include: this.getClienteIncludes(),
      });

      this.logger.log(
        `Cliente creado: ${cliente.nombre} (ID: ${cliente.id_cliente}) para empresa ${empresaId}`,
      );
      return cliente;
    });
  }

  protected async updateClienteTransaction(clienteId: number, updateData: any) {
    return this.prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.update({
        where: { id_cliente: clienteId },
        data: updateData,
        include: this.getClienteIncludes(),
      });

      this.logger.log(
        `Cliente actualizado: ${cliente.nombre} (ID: ${cliente.id_cliente})`,
      );
      return cliente;
    });
  }

  protected async deleteClienteFromEmpresa(
    empresaId: number,
    clienteId: number,
  ) {
    await this.clienteValidationService.validateClienteEmpresaExists(
      empresaId,
      clienteId,
    );

    return this.prisma.$transaction(async (tx) => {
      // Eliminar la relación cliente-empresa
      await tx.clienteEmpresa.delete({
        where: {
          cliente_id_empresa_id: {
            cliente_id: clienteId,
            empresa_id: empresaId,
          },
        },
      });

      // Verificar si el cliente tiene otras empresas asociadas
      const otrasEmpresas = await tx.clienteEmpresa.count({
        where: { cliente_id: clienteId },
      });

      // Si no tiene otras empresas, eliminar el cliente completamente
      if (otrasEmpresas === 0) {
        await tx.cliente.delete({
          where: { id_cliente: clienteId },
        });
        this.logger.log(`Cliente eliminado completamente: ID ${clienteId}`);
      } else {
        this.logger.log(
          `Cliente removido de empresa ${empresaId}: ID ${clienteId}`,
        );
      }

      return { message: 'Cliente procesado correctamente' };
    });
  }

  // Métodos que pueden ser sobrescritos por las clases hijas
  protected getClienteIncludes() {
    return {
      empresas: {
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
            },
          },
        },
      },
      usuario: {
        select: {
          id_usuario: true,
          nombre: true,
          email: true,
          telefono: true,
        },
      },
    };
  }

  protected getDefaultOrderBy() {
    return [{ nombre: 'asc' as const }, { fecha_registro: 'desc' as const }];
  }

  // Método para generar estadísticas de clientes
  protected async getClienteStats(empresaId: number) {
    const stats = await this.prisma.cliente.groupBy({
      by: ['tipo_cliente'],
      where: {
        empresas: {
          some: {
            empresa_id: empresaId,
          },
        },
      },
      _count: {
        id_cliente: true,
      },
      _avg: {
        limite_credito: true,
      },
    });

    const totalClientes = await this.prisma.cliente.count({
      where: {
        empresas: {
          some: {
            empresa_id: empresaId,
          },
        },
      },
    });

    return {
      total: totalClientes,
      porTipo: stats.map((stat) => ({
        tipo: stat.tipo_cliente,
        cantidad: stat._count.id_cliente,
        limiteCreditoPromedio: stat._avg.limite_credito,
      })),
    };
  }
}
