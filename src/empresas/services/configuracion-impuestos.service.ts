import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConfiguracionImpuestosDto } from '../dto/create-configuracion-impuestos.dto';
import { UpdateConfiguracionImpuestosDto } from '../dto/update-configuracion-impuestos.dto';

@Injectable()
export class ConfiguracionImpuestosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    empresaId: number,
    createConfiguracionImpuestosDto: CreateConfiguracionImpuestosDto,
  ) {
    // Verificar si la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }

    // Verificar si ya existe una configuración para esta empresa
    const configuracionExistente =
      await this.prisma.configuracionImpuestos.findUnique({
        where: { id_empresa: empresaId },
      });

    if (configuracionExistente) {
      throw new BadRequestException(
        `La empresa ya tiene una configuración de impuestos`,
      );
    }

    return this.prisma.configuracionImpuestos.create({
      data: {
        ...createConfiguracionImpuestosDto,
        empresa: {
          connect: { id_empresa: empresaId },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.configuracionImpuestos.findMany({
      include: {
        empresa: true,
      },
    });
  }

  async findOne(empresaId: number) {
    const configuracion = await this.prisma.configuracionImpuestos.findUnique({
      where: { id_empresa: empresaId },
      include: {
        empresa: true,
      },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de impuestos para la empresa ${empresaId} no encontrada`,
      );
    }

    return configuracion;
  }

  async update(
    empresaId: number,
    updateConfiguracionImpuestosDto: UpdateConfiguracionImpuestosDto,
  ) {
    // Verificar si la configuración existe
    const configuracion = await this.prisma.configuracionImpuestos.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de impuestos para la empresa ${empresaId} no encontrada`,
      );
    }

    return this.prisma.configuracionImpuestos.update({
      where: { id_empresa: empresaId },
      data: updateConfiguracionImpuestosDto,
    });
  }

  async remove(empresaId: number) {
    // Verificar si la configuración existe
    const configuracion = await this.prisma.configuracionImpuestos.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `Configuración de impuestos para la empresa ${empresaId} no encontrada`,
      );
    }

    return this.prisma.configuracionImpuestos.delete({
      where: { id_empresa: empresaId },
    });
  }
}
