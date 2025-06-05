import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  usuario_id: number;

  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'ContraseñaActual123!',
  })
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  @MinLength(8, {
    message: 'La contraseña actual debe tener al menos 8 caracteres',
  })
  @MaxLength(50, {
    message: 'La contraseña actual no puede exceder 50 caracteres',
  })
  currentPassword: string;

  @ApiProperty({
    description:
      'Nueva contraseña del usuario (debe incluir mayúscula, minúscula, número y carácter especial)',
    example: 'NuevaContraseña123!',
  })
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(50, {
    message: 'La nueva contraseña no puede exceder 50 caracteres',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NuevaContraseña123!',
  })
  @IsString({
    message: 'La confirmación de contraseña debe ser una cadena de texto',
  })
  @IsNotEmpty({ message: 'La confirmación de contraseña es obligatoria' })
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La confirmación no puede exceder 50 caracteres' })
  confirmNewPassword: string;
}
