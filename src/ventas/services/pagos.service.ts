import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePagoDto } from '../dto/create-pago.dto';
import { UpdatePagoDto } from '../dto/update-pago.dto';

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: number, createPagoDto: CreatePagoDto) {
    // Verificar si existe el historial de compra y está asociado a la empresa
    const historial = await this.prisma.historialCompra.findUnique({
      where: {
        id_historial: createPagoDto.id_historial,
      },
      include: {
        producto: {
          include: {
            empresa: true,
          },
        },
      },
    });

    if (!historial || historial.producto.id_empresa !== empresaId) {
      throw new NotFoundException('Historial de compra no encontrado');
    }

    // Verificar si existe el método de pago
    const metodoPago = await this.prisma.metodoPago.findUnique({
      where: {
        id_metodo_pago: createPagoDto.id_metodo_pago,
      },
    });

    if (!metodoPago) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    // Crear el pago
    const pago = await this.prisma.pago.create({
      data: {
        id_historial: createPagoDto.id_historial,
        id_metodo_pago: createPagoDto.id_metodo_pago,
        monto: createPagoDto.monto,
        estado_pago: createPagoDto.estado_pago ?? 'pendiente',
      },
      include: {
        historial: true,
        metodoPago: true,
      },
    });

    // Crear log de pago
    await this.prisma.logPago.create({
      data: {
        id_pago: pago.id_pago,
        id_usuario: createPagoDto.id_usuario,
        accion: 'creacion',
      },
    });

    return pago;
  }

  async findAll(empresaId: number) {
    // Obtener pagos relacionados con la empresa a través de los historiales de compra
    return this.prisma.pago.findMany({
      include: {
        historial: {
          include: {
            producto: {
              include: {
                empresa: true,
              },
            },
          },
        },
        metodoPago: true,
        logsPagos: true,
        reembolsos: true,
      },
      where: {
        historial: {
          producto: {
            id_empresa: empresaId,
          },
        },
      },
    });
  }

  async findOne(empresaId: number, id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: {
        id_pago: id,
      },
      include: {
        historial: {
          include: {
            producto: {
              include: {
                empresa: true,
              },
            },
          },
        },
        metodoPago: true,
        logsPagos: true,
        reembolsos: true,
      },
    });

    if (!pago || pago.historial.producto.id_empresa !== empresaId) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }

  async update(empresaId: number, id: number, updatePagoDto: UpdatePagoDto) {
    // Verificar si existe el pago y está asociado a la empresa
    await this.findOne(empresaId, id);

    // Si se está actualizando el método de pago, verificar que existe
    if (updatePagoDto.id_metodo_pago) {
      const metodoPago = await this.prisma.metodoPago.findUnique({
        where: {
          id_metodo_pago: updatePagoDto.id_metodo_pago,
        },
      });

      if (!metodoPago) {
        throw new NotFoundException('Método de pago no encontrado');
      }
    }

    // Actualizar el pago
    const pagoActualizado = await this.prisma.pago.update({
      where: {
        id_pago: id,
      },
      data: {
        monto: updatePagoDto.monto,
        estado_pago: updatePagoDto.estado_pago,
        id_metodo_pago: updatePagoDto.id_metodo_pago,
      },
      include: {
        historial: true,
        metodoPago: true,
        logsPagos: true,
        reembolsos: true,
      },
    });

    // Crear log de actualización
    if (updatePagoDto.id_usuario) {
      await this.prisma.logPago.create({
        data: {
          id_pago: id,
          id_usuario: updatePagoDto.id_usuario,
          accion: 'actualizacion',
        },
      });
    }

    return pagoActualizado;
  }

  async remove(empresaId: number, id: number) {
    // Verificar si existe el pago y está asociado a la empresa
    await this.findOne(empresaId, id);

    // Verificar si tiene reembolsos
    const reembolsos = await this.prisma.reembolso.findMany({
      where: {
        id_pago: id,
      },
    });

    if (reembolsos.length > 0) {
      throw new Error('No se puede eliminar un pago con reembolsos asociados');
    }

    return this.prisma.pago.delete({
      where: {
        id_pago: id,
      },
    });
  }

  async processPago(empresaId: number, id: number) {
    // Verificar si existe el pago y está asociado a la empresa
    const pago = await this.findOne(empresaId, id);

    // Validar que el pago esté en estado pendiente
    if (pago.estado_pago !== 'pendiente') {
      throw new Error('Solo se pueden procesar pagos en estado pendiente');
    }

    // Procesar el pago (en un caso real, aquí se integraría con un procesador de pagos)
    const pagoActualizado = await this.prisma.pago.update({
      where: {
        id_pago: id,
      },
      data: {
        estado_pago: 'completado',
        fecha_pago: new Date(), // Usar fecha_pago en lugar de fecha_procesamiento que no existe en el modelo
      },
    });

    // Crear log de procesamiento
    await this.prisma.logPago.create({
      data: {
        id_pago: id,
        id_usuario: 1, // Se debe proporcionar un ID de usuario
        accion: 'procesamiento',
      },
    });

    return pagoActualizado;
  }
}
