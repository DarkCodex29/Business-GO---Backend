import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum TipoNotificacion {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum EstadoNotificacion {
  PENDIENTE = 'pendiente',
  ENVIADA = 'enviada',
  FALLIDA = 'fallida',
  LEIDA = 'leida',
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID del cliente al que se enviará la notificación',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  clienteId: string;

  @ApiProperty({
    description: 'Tipo de notificación',
    enum: TipoNotificacion,
    example: TipoNotificacion.EMAIL,
  })
  @IsEnum(TipoNotificacion)
  tipo: TipoNotificacion;

  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Nueva oferta disponible',
  })
  @IsString()
  titulo: string;

  @ApiProperty({
    description: 'Contenido de la notificación',
    example: '¡Aprovecha nuestra oferta especial de verano!',
  })
  @IsString()
  contenido: string;

  @ApiProperty({
    description: 'Datos adicionales de la notificación en formato JSON',
    example: { promoCode: 'VERANO2024' },
    required: false,
  })
  @IsOptional()
  @IsString()
  datosAdicionales?: string;
}
