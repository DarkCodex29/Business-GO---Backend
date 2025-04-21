import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from '../dto/create-cliente.dto';
import { UpdateClientDto } from '../dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientes(empresaId: number) {
    return this.prisma.clienteEmpresa.findMany({
      where: {
        empresa_id: empresaId,
      },
      include: {
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            email: true,
            telefono: true,
            tipo_cliente: true,
            preferencias: true,
            limite_credito: true,
            dias_credito: true,
          },
        },
      },
    });
  }

  async getCliente(empresaId: number, clienteId: number) {
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        empresa_id: empresaId,
        cliente_id: clienteId,
      },
      include: {
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            email: true,
            telefono: true,
            tipo_cliente: true,
            preferencias: true,
            limite_credito: true,
            dias_credito: true,
          },
        },
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    return clienteEmpresa.cliente;
  }

  async createCliente(empresaId: number, createClienteDto: CreateClientDto) {
    const {
      nombre,
      email,
      telefono,
      tipo_cliente,
      preferencias,
      limite_credito,
      dias_credito,
      id_usuario,
    } = createClienteDto;

    // Crear el cliente
    const cliente = await this.prisma.cliente.create({
      data: {
        nombre,
        email,
        telefono,
        tipo_cliente,
        preferencias,
        limite_credito,
        dias_credito,
        usuario: id_usuario
          ? {
              connect: {
                id_usuario: id_usuario,
              },
            }
          : undefined,
        empresas: {
          create: {
            empresa_id: empresaId,
          },
        },
      },
    });

    return cliente;
  }

  async updateCliente(
    empresaId: number,
    clienteId: number,
    updateClienteDto: UpdateClientDto,
  ) {
    // Verificar que el cliente existe para la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        empresa_id: empresaId,
        cliente_id: clienteId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    // Actualizar el cliente
    return this.prisma.cliente.update({
      where: {
        id_cliente: clienteId,
      },
      data: updateClienteDto,
    });
  }
}
