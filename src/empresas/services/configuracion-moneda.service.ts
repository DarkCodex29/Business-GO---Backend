import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConfiguracionMonedaDto } from '../dto/create-configuracion-moneda.dto';
import { UpdateConfiguracionMonedaDto } from '../dto/update-configuracion-moneda.dto';
import { BaseConfiguracionService } from './base-configuracion.service';
import { EmpresaValidationService } from './empresa-validation.service';

@Injectable()
export class ConfiguracionMonedaService extends BaseConfiguracionService<
  any,
  CreateConfiguracionMonedaDto,
  UpdateConfiguracionMonedaDto
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly empresaValidationService: EmpresaValidationService,
  ) {
    super(prisma, empresaValidationService);
  }

  protected getConfigurationName(): string {
    return 'Configuración de moneda';
  }

  protected async findConfiguration(empresaId: number) {
    return this.prisma.configuracionMoneda.findUnique({
      where: { id_empresa: empresaId },
      include: { empresa: true },
    });
  }

  protected async createConfiguration(
    empresaId: number,
    createDto: CreateConfiguracionMonedaDto,
  ) {
    return this.prisma.configuracionMoneda.create({
      data: {
        id_empresa: empresaId,
        moneda_principal: createDto.moneda_principal,
        moneda_secundaria: createDto.moneda_secundaria,
        tipo_cambio: createDto.tipo_cambio,
        redondeo: createDto.redondeo,
        formato_moneda: createDto.formato_moneda,
      },
      include: { empresa: true },
    });
  }

  protected async updateConfiguration(
    empresaId: number,
    updateDto: UpdateConfiguracionMonedaDto,
  ) {
    return this.prisma.configuracionMoneda.update({
      where: { id_empresa: empresaId },
      data: updateDto,
      include: { empresa: true },
    });
  }

  protected async deleteConfiguration(empresaId: number): Promise<void> {
    await this.prisma.configuracionMoneda.delete({
      where: { id_empresa: empresaId },
    });
  }

  protected async validateUniqueConfiguration(
    empresaId: number,
  ): Promise<void> {
    const existing = await this.prisma.configuracionMoneda.findUnique({
      where: { id_empresa: empresaId },
    });

    if (existing) {
      throw new BadRequestException(
        'La empresa ya tiene una configuración de moneda',
      );
    }
  }

  protected validateCreateData(createDto: CreateConfiguracionMonedaDto): void {
    if (createDto.tipo_cambio <= 0) {
      throw new BadRequestException('El tipo de cambio debe ser mayor a 0');
    }

    if (createDto.redondeo < 0 || createDto.redondeo > 4) {
      throw new BadRequestException(
        'El redondeo debe estar entre 0 y 4 decimales',
      );
    }
  }

  async findAll() {
    return this.prisma.configuracionMoneda.findMany({
      include: {
        empresa: true,
      },
    });
  }
}
