import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  Matches,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juan@email.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    description:
      'Contraseña del usuario (mínimo 6 caracteres, debe contener al menos una letra y un número)',
    example: 'Password123!',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una letra y un número',
  })
  password: string;

  @ApiProperty({
    description: 'ID del rol del usuario',
    example: 1,
    required: false,
  })
  @IsNumber({}, { message: 'El ID del rol debe ser un número' })
  @IsPositive({ message: 'El ID del rol debe ser un número positivo' })
  @IsOptional()
  rolId?: number;

  @ApiProperty({
    description: 'DNI del usuario (8 dígitos)',
    example: '12345678',
    required: false,
  })
  @IsString({ message: 'El DNI debe ser una cadena de texto' })
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  @IsOptional()
  dni?: string;

  @ApiProperty({
    description: 'Teléfono del usuario (formato internacional)',
    example: '+51987654321',
    required: false,
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener formato internacional (+51987654321)',
  })
  @IsOptional()
  telefono?: string;
}
