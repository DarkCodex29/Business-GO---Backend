import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IEmpresaValidator {
  validateRuc(ruc: string): void;
  validateTelefono(telefono?: string): void;
  validateTipoEmpresa(tipo: string): void;
  validateEmpresaExists(empresaId: number): Promise<void>;
  validateUniqueRuc(ruc: string, excludeId?: number): Promise<void>;
}

@Injectable()
export class EmpresaValidationService implements IEmpresaValidator {
  private readonly TIPOS_EMPRESA_VALIDOS = [
    'SAC',
    'SRL',
    'SA',
    'EIRL',
    'SAS',
    'EMPRESA INDIVIDUAL',
  ];

  private readonly TIPOS_CONTRIBUYENTE_VALIDOS = [
    'RER',
    'RUS',
    'GENERAL',
    'MYPE',
  ];

  constructor(private readonly prisma: PrismaService) {}

  validateRuc(ruc: string): void {
    // RUC peruano: 11 dígitos, empieza con 10, 15, 17 o 20
    const rucRegex = /^(10|15|17|20)\d{9}$/;
    if (!rucRegex.test(ruc)) {
      throw new BadRequestException(
        'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20',
      );
    }

    // Validar dígito verificador del RUC
    if (!this.validateRucCheckDigit(ruc)) {
      throw new BadRequestException(
        'El RUC tiene un dígito verificador inválido',
      );
    }
  }

  validateTelefono(telefono?: string): void {
    if (telefono) {
      // Formato peruano: +51 seguido de 9 dígitos
      const telefonoRegex = /^\+51[0-9]{9}$/;
      if (!telefonoRegex.test(telefono)) {
        throw new BadRequestException(
          'El teléfono debe tener formato peruano: +51XXXXXXXXX',
        );
      }
    }
  }

  validateTipoEmpresa(tipo: string): void {
    if (!this.TIPOS_EMPRESA_VALIDOS.includes(tipo.toUpperCase())) {
      throw new BadRequestException(
        `Tipo de empresa inválido. Valores permitidos: ${this.TIPOS_EMPRESA_VALIDOS.join(', ')}`,
      );
    }
  }

  validateTipoContribuyente(tipo?: string): void {
    if (
      tipo &&
      !this.TIPOS_CONTRIBUYENTE_VALIDOS.includes(tipo.toUpperCase())
    ) {
      throw new BadRequestException(
        `Tipo de contribuyente inválido. Valores permitidos: ${this.TIPOS_CONTRIBUYENTE_VALIDOS.join(', ')}`,
      );
    }
  }

  async validateEmpresaExists(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
      select: { id_empresa: true },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }
  }

  async validateUniqueRuc(ruc: string, excludeId?: number): Promise<void> {
    const whereClause: any = { ruc };
    if (excludeId) {
      whereClause.NOT = { id_empresa: excludeId };
    }

    const existingEmpresa = await this.prisma.empresa.findFirst({
      where: whereClause,
      select: { id_empresa: true, nombre: true },
    });

    if (existingEmpresa) {
      throw new BadRequestException(
        `Ya existe una empresa registrada con el RUC ${ruc}`,
      );
    }
  }

  private validateRucCheckDigit(ruc: string): boolean {
    const digits = ruc.split('').map(Number);
    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * factors[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return checkDigit === digits[10];
  }
}
