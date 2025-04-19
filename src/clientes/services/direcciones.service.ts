import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDireccion(
    empresaId: number,
    clienteId: number,
    createDireccionDto: CreateClienteDireccionDto,
  ) {
    // Verificar que el cliente pertenece a la empresa
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

    return this.prisma.direccion.create({
      data: {
        ...createDireccionDto,
        id_empresa: empresaId,
      },
    });
  }

  async getDireccionesCliente(empresaId: number, clienteId: number) {
    // Verificar que el cliente pertenece a la empresa
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

    return this.prisma.direccion.findMany({
      where: {
        id_empresa: empresaId,
      },
    });
  }

  async getDireccion(empresaId: number, direccionId: number) {
    const direccion = await this.prisma.direccion.findFirst({
      where: {
        id_direccion: direccionId,
        id_empresa: empresaId,
      },
    });

    if (!direccion) {
      throw new NotFoundException(
        `Dirección con ID ${direccionId} no encontrada para la empresa ${empresaId}`,
      );
    }

    return direccion;
  }

  async updateDireccion(
    empresaId: number,
    direccionId: number,
    updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    // Verificar que la dirección pertenece a la empresa
    const direccion = await this.prisma.direccion.findFirst({
      where: {
        id_direccion: direccionId,
        id_empresa: empresaId,
      },
    });

    if (!direccion) {
      throw new NotFoundException(
        `Dirección con ID ${direccionId} no encontrada para la empresa ${empresaId}`,
      );
    }

    return this.prisma.direccion.update({
      where: {
        id_direccion: direccionId,
      },
      data: updateDireccionDto,
    });
  }

  async deleteDireccion(empresaId: number, direccionId: number) {
    // Verificar que la dirección pertenece a la empresa
    const direccion = await this.prisma.direccion.findFirst({
      where: {
        id_direccion: direccionId,
        id_empresa: empresaId,
      },
    });

    if (!direccion) {
      throw new NotFoundException(
        `Dirección con ID ${direccionId} no encontrada para la empresa ${empresaId}`,
      );
    }

    return this.prisma.direccion.delete({
      where: {
        id_direccion: direccionId,
      },
    });
  }
}
