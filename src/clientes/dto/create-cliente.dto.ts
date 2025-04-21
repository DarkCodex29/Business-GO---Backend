import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsObject,
} from 'class-validator';

export enum TipoCliente {
  INDIVIDUAL = 'individual',
  EMPRESA = 'empresa',
  VIP = 'vip',
}

export interface PreferenciasCliente {
  idioma?: string;
  moneda?: string;
  [key: string]: any;
}

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'juan.perez@email.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Número de teléfono del cliente',
    example: '+51999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({
    description: 'Tipo de cliente',
    enum: TipoCliente,
    example: TipoCliente.INDIVIDUAL,
    default: TipoCliente.INDIVIDUAL,
  })
  @IsEnum(TipoCliente)
  tipo_cliente: TipoCliente;

  @ApiProperty({
    description: 'Preferencias del cliente',
    example: { idioma: 'es', moneda: 'PEN' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  preferencias?: PreferenciasCliente;

  @ApiProperty({
    description: 'Límite de crédito del cliente',
    example: 1000.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  limite_credito?: number;

  @ApiProperty({
    description: 'Días de crédito del cliente',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  dias_credito?: number;

  @ApiProperty({
    description: 'ID del usuario asociado (si existe)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  id_usuario?: string;
}
