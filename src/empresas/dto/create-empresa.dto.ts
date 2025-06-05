import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Matches,
  Length,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CreateEmpresaDto {
  @ApiProperty({
    description: 'Nombre comercial de la empresa',
    example: 'Mi Empresa SAC',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'Mi Empresa Sociedad Anónima Cerrada',
    minLength: 2,
    maxLength: 200,
  })
  @IsString({ message: 'La razón social debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @Length(2, 200, {
    message: 'La razón social debe tener entre 2 y 200 caracteres',
  })
  razon_social: string;

  @ApiProperty({
    description: 'Nombre comercial de la empresa',
    example: 'Mi Empresa',
    required: false,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre comercial debe ser una cadena de texto' })
  @IsOptional()
  @Length(2, 100, {
    message: 'El nombre comercial debe tener entre 2 y 100 caracteres',
  })
  nombre_comercial?: string;

  @ApiProperty({
    description:
      'RUC de la empresa (11 dígitos, debe empezar con 10, 15, 17 o 20)',
    example: '20123456789',
    pattern: '^(10|15|17|20)\\d{9}$',
  })
  @IsString({ message: 'El RUC debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El RUC es obligatorio' })
  @Matches(/^(10|15|17|20)\d{9}$/, {
    message: 'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20',
  })
  ruc: string;

  @ApiProperty({
    description: 'Teléfono de la empresa en formato peruano',
    example: '+51987654321',
    required: false,
    pattern: '^\\+51[0-9]{9}$',
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  @Matches(/^\+51[0-9]{9}$/, {
    message: 'El teléfono debe tener formato peruano: +51XXXXXXXXX',
  })
  telefono?: string;

  @ApiProperty({
    description: 'Tipo de empresa',
    example: 'SAC',
    enum: ['SAC', 'SRL', 'SA', 'EIRL', 'SAS', 'EMPRESA INDIVIDUAL'],
  })
  @IsString({ message: 'El tipo de empresa debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo de empresa es obligatorio' })
  @IsIn(['SAC', 'SRL', 'SA', 'EIRL', 'SAS', 'EMPRESA INDIVIDUAL'], {
    message:
      'Tipo de empresa inválido. Valores permitidos: SAC, SRL, SA, EIRL, SAS, EMPRESA INDIVIDUAL',
  })
  tipo_empresa: string;

  @ApiProperty({
    description: 'Tipo de contribuyente',
    example: 'RER',
    required: false,
    enum: ['RER', 'RUS', 'GENERAL', 'MYPE'],
  })
  @IsString({
    message: 'El tipo de contribuyente debe ser una cadena de texto',
  })
  @IsOptional()
  @IsIn(['RER', 'RUS', 'GENERAL', 'MYPE'], {
    message:
      'Tipo de contribuyente inválido. Valores permitidos: RER, RUS, GENERAL, MYPE',
  })
  tipo_contribuyente?: string;

  @ApiProperty({
    description: 'Latitud de la ubicación de la empresa',
    example: -12.0464,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @IsOptional()
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90 grados' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90 grados' })
  latitud?: number;

  @ApiProperty({
    description: 'Longitud de la ubicación de la empresa',
    example: -77.0428,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @IsOptional()
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180 grados' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180 grados' })
  longitud?: number;
}
