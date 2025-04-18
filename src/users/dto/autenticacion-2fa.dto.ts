import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate } from 'class-validator';

export class Autenticacion2FADto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  id_usuario: number;

  @ApiProperty({
    description: 'Código de verificación',
    example: '123456',
  })
  @IsString()
  codigo_verificacion: string;

  @ApiProperty({
    description: 'Fecha de expiración del código',
    example: '2024-03-20T11:00:00Z',
  })
  @IsDate()
  fecha_expiracion: Date;

  @ApiProperty({
    description: 'Estado de la autenticación',
    example: 'pendiente',
    enum: ['pendiente', 'verificado', 'expirado'],
  })
  @IsString()
  estado: string;
}
