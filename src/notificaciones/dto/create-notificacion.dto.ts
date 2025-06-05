import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum TipoNotificacion {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WHATSAPP = 'whatsapp',
}

export enum EstadoNotificacion {
  PENDIENTE = 'pendiente',
  ENVIADA = 'enviada',
  FALLIDA = 'fallida',
  LEIDA = 'leida',
}

export class CreateNotificacionDto {
  @ApiProperty({
    description: 'Tipo de notificación',
    enum: TipoNotificacion,
    example: TipoNotificacion.EMAIL,
  })
  @IsEnum(TipoNotificacion)
  @IsNotEmpty()
  tipo: TipoNotificacion;

  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Nueva oferta especial',
  })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({
    description: 'Contenido de la notificación',
    example: '¡Aprovecha nuestra oferta del 20% de descuento!',
  })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiProperty({
    description: 'Estado de la notificación',
    enum: EstadoNotificacion,
    example: EstadoNotificacion.PENDIENTE,
    default: EstadoNotificacion.PENDIENTE,
  })
  @IsEnum(EstadoNotificacion)
  @IsOptional()
  estado?: EstadoNotificacion;

  @ApiProperty({
    description: 'Enlace opcional asociado a la notificación',
    example: 'https://ejemplo.com/oferta',
    required: false,
  })
  @IsString()
  @IsOptional()
  enlace?: string;

  @ApiProperty({
    description: 'Datos adicionales de la notificación en formato JSON',
    example: { promoCode: 'VERANO2024' },
    required: false,
  })
  @IsString()
  @IsOptional()
  datosAdicionales?: string;
}
