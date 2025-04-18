import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juan@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    example: 'Contraseña123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  contrasena: string;

  @ApiProperty({
    description: 'Número de teléfono del usuario',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({
    description: 'ID del rol del usuario',
    example: 1,
  })
  @IsNumber()
  rolId: number;

  @ApiProperty({
    description: 'ID del cliente asociado',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  clienteId?: number;

  @ApiProperty({
    description: 'ID de la empresa a la que pertenece el usuario',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  empresaId?: number;

  @ApiProperty({
    description: 'Indica si el usuario es dueño de la empresa',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  esDueno?: boolean;
}
