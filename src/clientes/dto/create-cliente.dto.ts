import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsNotEmpty,
  Length,
  Matches,
  Min,
  Max,
  IsPositive,
} from 'class-validator';

export enum TipoCliente {
  INDIVIDUAL = 'INDIVIDUAL',
  EMPRESA = 'EMPRESA',
  VIP = 'VIP',
  CORPORATIVO = 'CORPORATIVO',
}

export interface PreferenciasCliente {
  idioma?: 'es' | 'en' | 'qu';
  moneda?: 'PEN' | 'USD' | 'EUR';
  notificaciones?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  [key: string]: any;
}

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez García',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'juan.perez@empresa.com.pe',
    format: 'email',
  })
  @IsEmail({}, { message: 'El formato del email es inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @Length(5, 255, { message: 'El email debe tener entre 5 y 255 caracteres' })
  email: string;

  @ApiProperty({
    description: 'Número de teléfono del cliente en formato peruano',
    example: '+51987654321',
    required: false,
    pattern: '^\\+51[0-9]{8,9}$',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @Matches(/^\+51[0-9]{8,9}$/, {
    message: 'El teléfono debe tener formato peruano válido: +51XXXXXXXXX',
  })
  telefono?: string;

  @ApiProperty({
    description: 'Tipo de cliente',
    enum: TipoCliente,
    example: TipoCliente.INDIVIDUAL,
    default: TipoCliente.INDIVIDUAL,
  })
  @IsEnum(TipoCliente, {
    message:
      'Tipo de cliente inválido. Valores permitidos: INDIVIDUAL, EMPRESA, VIP, CORPORATIVO',
  })
  tipo_cliente: TipoCliente;

  @ApiProperty({
    description: 'Preferencias del cliente',
    example: {
      idioma: 'es',
      moneda: 'PEN',
      notificaciones: {
        email: true,
        sms: false,
        whatsapp: true,
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las preferencias deben ser un objeto válido' })
  preferencias?: PreferenciasCliente;

  @ApiProperty({
    description: 'Límite de crédito del cliente en soles peruanos',
    example: 5000.0,
    required: false,
    minimum: 0,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El límite de crédito debe ser un número' })
  @Min(0, { message: 'El límite de crédito no puede ser negativo' })
  @Max(100000, { message: 'El límite de crédito no puede exceder S/ 100,000' })
  limite_credito?: number;

  @ApiProperty({
    description: 'Días de crédito del cliente',
    example: 30,
    required: false,
    minimum: 0,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Los días de crédito deben ser un número' })
  @Min(0, { message: 'Los días de crédito no pueden ser negativos' })
  @Max(365, { message: 'Los días de crédito no pueden exceder 365 días' })
  dias_credito?: number;

  @ApiProperty({
    description: 'ID del usuario asociado (opcional)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID de usuario debe ser un número' })
  @IsPositive({ message: 'El ID de usuario debe ser un número positivo' })
  id_usuario?: number;
}
