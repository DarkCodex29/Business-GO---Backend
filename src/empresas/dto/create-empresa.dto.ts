import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDecimal,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmpresaDto {
  @ApiProperty({
    description: 'Nombre comercial de la empresa',
    example: 'Mi Empresa SAC',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'Mi Empresa Sociedad Anónima Cerrada',
  })
  @IsString()
  @IsNotEmpty()
  razon_social: string;

  @ApiProperty({
    description: 'Nombre comercial de la empresa',
    example: 'Mi Empresa',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombre_comercial?: string;

  @ApiProperty({
    description: 'RUC de la empresa',
    example: '20123456789',
  })
  @IsString()
  @IsNotEmpty()
  ruc: string;

  @ApiProperty({
    description: 'Teléfono de la empresa',
    example: '+51987654321',
    required: false,
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({
    description: 'Tipo de empresa',
    example: 'SAC',
  })
  @IsString()
  @IsNotEmpty()
  tipo_empresa: string;

  @ApiProperty({
    description: 'Tipo de contribuyente',
    example: 'RER',
    required: false,
  })
  @IsString()
  @IsOptional()
  tipo_contribuyente?: string;

  @ApiProperty({
    description: 'Latitud de la ubicación de la empresa',
    example: -12.0464,
  })
  @IsNumber()
  @IsNotEmpty()
  latitud: number;

  @ApiProperty({
    description: 'Longitud de la ubicación de la empresa',
    example: -77.0428,
  })
  @IsNumber()
  @IsNotEmpty()
  longitud: number;
}
