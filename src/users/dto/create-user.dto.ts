import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan@ejemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'contraseña123',
  })
  @IsString()
  @MinLength(8)
  contrasena: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+1234567890',
  })
  @IsString()
  telefono: string;

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
    description: 'ID de la empresa asociada',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  empresaId?: number;
}
