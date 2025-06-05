import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNotEmpty,
  Length,
  Matches,
} from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({
    example: 'Distribuidora ABC S.A.C.',
    description: 'Nombre o razón social del proveedor',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  nombre: string;

  @ApiProperty({
    example: '20123456789',
    description: 'RUC del proveedor (11 dígitos)',
    pattern: '^(10|15|17|20)\\d{9}$',
  })
  @IsString({ message: 'El RUC debe ser texto' })
  @IsNotEmpty({ message: 'El RUC es obligatorio' })
  @Matches(/^(10|15|17|20)\d{9}$/, {
    message: 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20',
  })
  ruc: string;

  @ApiProperty({
    example: 'Av. Los Olivos 123, San Isidro, Lima',
    description: 'Dirección completa del proveedor',
    maxLength: 200,
  })
  @IsString({ message: 'La dirección debe ser texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @Length(5, 200, { message: 'La dirección debe tener entre 5 y 200 caracteres' })
  direccion: string;

  @ApiProperty({
    example: '+51987654321',
    description: 'Teléfono del proveedor (incluir código de país)',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener un formato válido (ej: +51987654321)',
  })
  telefono: string;

  @ApiProperty({
    example: 'contacto@distribuidoraabc.com',
    description: 'Email de contacto del proveedor',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({
    example: 'Juan Pérez - Gerente de Ventas',
    description: 'Nombre y cargo del contacto principal',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'El contacto principal debe ser texto' })
  @Length(0, 100, { message: 'El contacto principal no puede exceder 100 caracteres' })
  contacto_principal?: string;

  @ApiProperty({
    example: 'Proveedor especializado en productos de oficina',
    description: 'Notas adicionales sobre el proveedor',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  @Length(0, 500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notas?: string;

  @ApiProperty({
    example: true,
    description: 'Estado activo del proveedor',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;
}
