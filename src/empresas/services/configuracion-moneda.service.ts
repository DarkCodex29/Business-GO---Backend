import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConfiguracionMonedaDto } from '../dto/create-configuracion-moneda.dto';
import { UpdateConfiguracionMonedaDto } from '../dto/update-configuracion-moneda.dto';

@Injectable()
export class ConfiguracionMonedaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    empresaId: number,
    createConfiguracionMonedaDto: CreateConfiguracionMonedaDto,
  ) {
    // Verificar si la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }

    // Verificar si ya existe una configuración de moneda para la empresa
    const configuracionExistente =
      await this.prisma.configuracionMoneda.findUnique({
        where: { id_empresa: empresaId },
      });

    if (configuracionExistente) {
      throw new Error('La empresa ya tiene una configuración de moneda');
    }

    // Crear la configuración de moneda
    return this.prisma.configuracionMoneda.create({
      data: {
        id_empresa: empresaId,
        moneda_principal: createConfiguracionMonedaDto.moneda_principal,
        moneda_secundaria: createConfiguracionMonedaDto.moneda_secundaria,
        tipo_cambio: createConfiguracionMonedaDto.tipo_cambio,
        redondeo: createConfiguracionMonedaDto.redondeo,
        formato_moneda: createConfiguracionMonedaDto.formato_moneda,
      },
    });
  }

  async findAll() {
    return this.prisma.configuracionMoneda.findMany({
      include: {
        empresa: true,
      },
    });
  }

  async findOne(empresaId: number) {
    const configuracion = await this.prisma.configuracionMoneda.findUnique({
      where: { id_empresa: empresaId },
      include: {
        empresa: true,
      },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de moneda para empresa ${empresaId} no encontrada`,
      );
    }

    return configuracion;
  }

  async update(
    empresaId: number,
    updateConfiguracionMonedaDto: UpdateConfiguracionMonedaDto,
  ) {
    // Verificar si existe la configuración
    const configuracion = await this.prisma.configuracionMoneda.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de moneda para empresa ${empresaId} no encontrada`,
      );
    }

    // Actualizar la configuración
    return this.prisma.configuracionMoneda.update({
      where: { id_empresa: empresaId },
      data: updateConfiguracionMonedaDto,
      include: {
        empresa: true,
      },
    });
  }

  async remove(empresaId: number) {
    // Verificar si existe la configuración
    const configuracion = await this.prisma.configuracionMoneda.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de moneda para empresa ${empresaId} no encontrada`,
      );
    }

    // Eliminar la configuración
    return this.prisma.configuracionMoneda.delete({
      where: { id_empresa: empresaId },
    });
  }
}
