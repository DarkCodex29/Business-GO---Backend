import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IClienteValidator {
  validateEmail(email: string): void;
  validateTelefono(telefono?: string): void;
  validateTipoCliente(tipo: string): void;
  validateLimiteCredito(limite?: number): void;
  validateDiasCredito(dias?: number): void;
  validateClienteEmpresaExists(
    empresaId: number,
    clienteId: number,
  ): Promise<void>;
  validateUniqueEmail(
    email: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void>;
  validateUsuarioExists(usuarioId: number): Promise<void>;
}

@Injectable()
export class ClienteValidationService implements IClienteValidator {
  private readonly TIPOS_CLIENTE_VALIDOS = [
    'INDIVIDUAL',
    'EMPRESA',
    'VIP',
    'CORPORATIVO',
  ];

  private readonly MAX_LIMITE_CREDITO = 100000; // S/ 100,000
  private readonly MAX_DIAS_CREDITO = 365; // 1 año máximo

  constructor(private readonly prisma: PrismaService) {}

  validateEmail(email: string): void {
    // Validación más estricta para emails empresariales peruanos
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El formato del email es inválido');
    }

    // Validar dominios sospechosos
    const suspiciousDomains = ['tempmail', '10minutemail', 'guerrillamail'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (suspiciousDomains.some((suspicious) => domain?.includes(suspicious))) {
      throw new BadRequestException('No se permiten emails temporales');
    }
  }

  validateTelefono(telefono?: string): void {
    if (telefono) {
      // Formato peruano: +51 seguido de 9 dígitos (móvil) o +51 1 seguido de 7 dígitos (fijo Lima)
      const telefonoMovilRegex = /^\+51[9][0-9]{8}$/;
      const telefonoFijoLimaRegex = /^\+511[0-9]{7}$/;
      const telefonoFijoProvinciaRegex = /^\+51[0-9]{2}[0-9]{6}$/;

      if (
        !telefonoMovilRegex.test(telefono) &&
        !telefonoFijoLimaRegex.test(telefono) &&
        !telefonoFijoProvinciaRegex.test(telefono)
      ) {
        throw new BadRequestException(
          'El teléfono debe tener formato peruano válido: +51XXXXXXXXX (móvil) o +511XXXXXXX (fijo Lima)',
        );
      }
    }
  }

  validateTipoCliente(tipo: string): void {
    if (!this.TIPOS_CLIENTE_VALIDOS.includes(tipo.toUpperCase())) {
      throw new BadRequestException(
        `Tipo de cliente inválido. Valores permitidos: ${this.TIPOS_CLIENTE_VALIDOS.join(', ')}`,
      );
    }
  }

  validateLimiteCredito(limite?: number): void {
    if (limite !== undefined) {
      if (limite < 0) {
        throw new BadRequestException(
          'El límite de crédito no puede ser negativo',
        );
      }

      if (limite > this.MAX_LIMITE_CREDITO) {
        throw new BadRequestException(
          `El límite de crédito no puede exceder S/ ${this.MAX_LIMITE_CREDITO.toLocaleString()}`,
        );
      }
    }
  }

  validateDiasCredito(dias?: number): void {
    if (dias !== undefined) {
      if (dias < 0) {
        throw new BadRequestException(
          'Los días de crédito no pueden ser negativos',
        );
      }

      if (dias > this.MAX_DIAS_CREDITO) {
        throw new BadRequestException(
          `Los días de crédito no pueden exceder ${this.MAX_DIAS_CREDITO} días`,
        );
      }
    }
  }

  async validateClienteEmpresaExists(
    empresaId: number,
    clienteId: number,
  ): Promise<void> {
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        empresa_id: empresaId,
        cliente_id: clienteId,
      },
      select: { id_cliente_empresa: true },
    });

    if (!clienteEmpresa) {
      throw new NotFoundException(
        `Cliente con ID ${clienteId} no encontrado para la empresa ${empresaId}`,
      );
    }
  }

  async validateUniqueEmail(
    email: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = {
      email,
      empresas: {
        some: {
          empresa_id: empresaId,
        },
      },
    };

    if (excludeId) {
      whereClause.NOT = { id_cliente: excludeId };
    }

    const existingCliente = await this.prisma.cliente.findFirst({
      where: whereClause,
      select: { id_cliente: true, nombre: true },
    });

    if (existingCliente) {
      throw new BadRequestException(
        `Ya existe un cliente con el email ${email} en esta empresa`,
      );
    }
  }

  async validateUsuarioExists(usuarioId: number): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      select: { id_usuario: true, activo: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
    }

    if (!usuario.activo) {
      throw new BadRequestException(
        `El usuario con ID ${usuarioId} está inactivo`,
      );
    }
  }

  validatePreferencias(preferencias?: any): void {
    if (preferencias) {
      // Validar estructura básica de preferencias
      if (typeof preferencias !== 'object') {
        throw new BadRequestException(
          'Las preferencias deben ser un objeto válido',
        );
      }

      // Validar idioma si está presente
      if (preferencias.idioma) {
        const idiomasValidos = ['es', 'en', 'qu']; // Español, Inglés, Quechua
        if (!idiomasValidos.includes(preferencias.idioma)) {
          throw new BadRequestException(
            `Idioma inválido. Valores permitidos: ${idiomasValidos.join(', ')}`,
          );
        }
      }

      // Validar moneda si está presente
      if (preferencias.moneda) {
        const monedasValidas = ['PEN', 'USD', 'EUR'];
        if (!monedasValidas.includes(preferencias.moneda)) {
          throw new BadRequestException(
            `Moneda inválida. Valores permitidos: ${monedasValidas.join(', ')}`,
          );
        }
      }
    }
  }
}
