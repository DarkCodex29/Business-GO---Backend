import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan@ejemplo.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'contraseña123',
    required: false,
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  contrasena?: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  telefono?: string;

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
  })
  @IsBoolean()
  @IsOptional()
  esDueno?: boolean;
}
