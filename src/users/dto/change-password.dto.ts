import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
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
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  currentPassword: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'NuevaContraseña123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NuevaContraseña123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  confirmNewPassword: string;
}
