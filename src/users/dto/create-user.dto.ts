import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  IsBoolean,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juan@example.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    description:
      'Contraseña del usuario (mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y carácter especial)',
    example: 'MiContraseña123!',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  contrasena: string;

  @ApiProperty({
    description: 'Número de teléfono del usuario (formato internacional)',
    example: '+51999999999',
    required: false,
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener un formato válido (ej: +51999999999)',
  })
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
