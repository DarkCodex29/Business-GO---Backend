import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFidelizacionDto } from '../dto/create-fidelizacion.dto';
import { UpdatePuntosFidelizacionDto } from '../dto/update-puntos-fidelizacion.dto';

@Injectable()
export class FidelizacionService {
  constructor(private readonly prisma: PrismaService) {}

  async createFidelizacion(
    empresaId: number,
    createFidelizacionDto: CreateFidelizacionDto,
  ) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: createFidelizacionDto.cliente_id,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${createFidelizacionDto.cliente_id} no encontrado para la empresa ${empresaId}`,
      );
    }

    return this.prisma.fidelizacion.create({
      data: {
        id_cliente: createFidelizacionDto.cliente_id,
        fecha_inicio: new Date(),
        puntos_actuales: createFidelizacionDto.puntos,
        fecha_fin: null,
      },
    });
  }

  async getFidelizacionCliente(empresaId: number, clienteId: number) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    return this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
      },
    });
  }

  async getFidelizacionEmpresa(empresaId: number) {
    // Obtener todos los clientes de la empresa
    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresa_id: empresaId },
      select: { cliente_id: true },
    });

    const clienteIds = clientesEmpresa.map((ce) => ce.cliente_id);

    // Obtener las fidelizaciones de los clientes de la empresa
    return this.prisma.fidelizacion.findMany({
      where: {
        id_cliente: { in: clienteIds },
      },
    });
  }

  async updatePuntosFidelizacion(
    empresaId: number,
    clienteId: number,
    updatePuntosFidelizacionDto: UpdatePuntosFidelizacionDto,
  ) {
    // Verificar que el cliente pertenece a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        cliente_id: clienteId,
        empresa_id: empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }

    // Verificar que existe una fidelización
    const fidelizacion = await this.prisma.fidelizacion.findFirst({
      where: {
        id_cliente: clienteId,
      },
    });

    if (!fidelizacion) {
      throw new NotFoundException(
        `No existe una fidelización para el cliente ${clienteId}`,
      );
    }

    // Actualizar los puntos
    return this.prisma.fidelizacion.update({
      where: { id_fidelizacion: fidelizacion.id_fidelizacion },
      data: {
        puntos_actuales: updatePuntosFidelizacionDto.puntos_actuales,
        fecha_fin: updatePuntosFidelizacionDto.fecha_fin
          ? new Date(updatePuntosFidelizacionDto.fecha_fin)
          : undefined,
      },
    });
  }
}
