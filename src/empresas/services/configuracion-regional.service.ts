import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConfiguracionRegionalDto } from '../dto/create-configuracion-regional.dto';
import { UpdateConfiguracionRegionalDto } from '../dto/update-configuracion-regional.dto';
import { BaseConfiguracionService } from './base-configuracion.service';
import { EmpresaValidationService } from './empresa-validation.service';

@Injectable()
export class ConfiguracionRegionalService extends BaseConfiguracionService<
  any,
  CreateConfiguracionRegionalDto,
  UpdateConfiguracionRegionalDto
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly empresaValidationService: EmpresaValidationService,
  ) {
    super(prisma, empresaValidationService);
  }

  protected getConfigurationName(): string {
    return 'Configuración regional';
  }

  protected async findConfiguration(empresaId: number) {
    return this.prisma.configuracionRegional.findUnique({
      where: { id_empresa: empresaId },
      include: { empresa: true },
    });
  }

  protected async createConfiguration(
    empresaId: number,
    createDto: CreateConfiguracionRegionalDto,
  ) {
    return this.prisma.configuracionRegional.create({
      data: {
        id_empresa: empresaId,
        zona_horaria: createDto.zona_horaria,
        formato_fecha: createDto.formato_fecha,
        formato_hora: createDto.formato_hora,
        idioma: createDto.idioma,
        formato_numero: createDto.formato_numero,
      },
      include: { empresa: true },
    });
  }

  protected async updateConfiguration(
    empresaId: number,
    updateDto: UpdateConfiguracionRegionalDto,
  ) {
    return this.prisma.configuracionRegional.update({
      where: { id_empresa: empresaId },
      data: updateDto,
      include: { empresa: true },
    });
  }

  protected async deleteConfiguration(empresaId: number): Promise<void> {
    await this.prisma.configuracionRegional.delete({
      where: { id_empresa: empresaId },
    });
  }

  protected async validateUniqueConfiguration(
    empresaId: number,
  ): Promise<void> {
    const existing = await this.prisma.configuracionRegional.findUnique({
      where: { id_empresa: empresaId },
    });

    if (existing) {
      throw new BadRequestException(
        'La empresa ya tiene una configuración regional',
      );
    }
  }

  async findAll() {
    return this.prisma.configuracionRegional.findMany({
      include: {
        empresa: true,
      },
    });
  }
}
