import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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
    description: 'Teléfono del usuario',
    example: '+34123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  telefono?: string;
}
