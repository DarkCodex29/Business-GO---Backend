import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    example: 'contraseña123',
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password: string;
}
