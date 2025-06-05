import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { EstadoNotificacion } from './create-notificacion.dto';

export class UpdateNotificacionDto {
  @ApiProperty({
    description: 'Contenido actualizado de la notificación',
    example: 'Contenido actualizado de la notificación',
    required: false,
  })
  @IsString()
  @IsOptional()
  contenido?: string;

  @ApiProperty({
    description: 'Estado actualizado de la notificación',
    enum: EstadoNotificacion,
    example: EstadoNotificacion.LEIDA,
    required: false,
  })
  @IsEnum(EstadoNotificacion)
  @IsOptional()
  estado?: EstadoNotificacion;

  @ApiProperty({
    description: 'Enlace actualizado asociado a la notificación',
    example: 'https://ejemplo.com/nueva-oferta',
    required: false,
  })
  @IsString()
  @IsOptional()
  enlace?: string;

  @ApiProperty({
    description: 'Datos adicionales actualizados en formato JSON',
    example: { promoCode: 'INVIERNO2024' },
    required: false,
  })
  @IsString()
  @IsOptional()
  datosAdicionales?: string;
}
