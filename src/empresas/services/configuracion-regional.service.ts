import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConfiguracionRegionalDto } from '../dto/create-configuracion-regional.dto';
import { UpdateConfiguracionRegionalDto } from '../dto/update-configuracion-regional.dto';

@Injectable()
export class ConfiguracionRegionalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    empresaId: number,
    createConfiguracionRegionalDto: CreateConfiguracionRegionalDto,
  ) {
    // Verificar si la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }

    // Verificar si ya existe una configuración regional para la empresa
    const configuracionExistente =
      await this.prisma.configuracionRegional.findUnique({
        where: { id_empresa: empresaId },
      });

    if (configuracionExistente) {
      throw new Error('La empresa ya tiene una configuración regional');
    }

    // Crear la configuración regional
    return this.prisma.configuracionRegional.create({
      data: {
        id_empresa: empresaId,
        zona_horaria: createConfiguracionRegionalDto.zona_horaria,
        formato_fecha: createConfiguracionRegionalDto.formato_fecha,
        formato_hora: createConfiguracionRegionalDto.formato_hora,
        idioma: createConfiguracionRegionalDto.idioma,
        formato_numero: createConfiguracionRegionalDto.formato_numero,
      },
    });
  }

  async findAll() {
    return this.prisma.configuracionRegional.findMany({
      include: {
        empresa: true,
      },
    });
  }

  async findOne(empresaId: number) {
    const configuracion = await this.prisma.configuracionRegional.findUnique({
      where: { id_empresa: empresaId },
      include: {
        empresa: true,
      },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración regional para empresa ${empresaId} no encontrada`,
      );
    }

    return configuracion;
  }

  async update(
    empresaId: number,
    updateConfiguracionRegionalDto: UpdateConfiguracionRegionalDto,
  ) {
    // Verificar si existe la configuración
    const configuracion = await this.prisma.configuracionRegional.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración regional para empresa ${empresaId} no encontrada`,
      );
    }

    // Actualizar la configuración
    return this.prisma.configuracionRegional.update({
      where: { id_empresa: empresaId },
      data: updateConfiguracionRegionalDto,
      include: {
        empresa: true,
      },
    });
  }

  async remove(empresaId: number) {
    // Verificar si existe la configuración
    const configuracion = await this.prisma.configuracionRegional.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración regional para empresa ${empresaId} no encontrada`,
      );
    }

    // Eliminar la configuración
    return this.prisma.configuracionRegional.delete({
      where: { id_empresa: empresaId },
    });
  }
}
