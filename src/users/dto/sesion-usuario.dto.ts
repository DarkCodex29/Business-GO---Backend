import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class SesionUsuarioDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  id_usuario: number;

  @ApiProperty({
    description: 'Token de la sesión',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Dispositivo desde donde se inició la sesión',
    example: 'Chrome en Windows 10',
    required: false,
  })
  @IsOptional()
  @IsString()
  dispositivo?: string;

  @ApiProperty({
    description: 'Dirección IP del dispositivo',
    example: '192.168.1.1',
    required: false,
  })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiProperty({
    description: 'Indica si la sesión está activa',
    example: true,
    default: true,
  })
  @IsBoolean()
  activa: boolean;

  @ApiProperty({
    description: 'Fecha de creación de la sesión',
    example: '2024-03-20T10:00:00Z',
  })
  @IsDate()
  fecha_creacion: Date;

  @ApiProperty({
    description: 'Fecha de expiración de la sesión',
    example: '2024-03-21T10:00:00Z',
  })
  @IsDate()
  fecha_expiracion: Date;
}
