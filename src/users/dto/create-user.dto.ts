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
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juan@email.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'ID del rol del usuario',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  rolId?: number;

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
