import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum EstadoModeracion {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  PENDIENTE = 'PENDIENTE',
}

export class ModerarValoracionDto {
  @ApiProperty({
    description: 'Estado de moderación de la valoración',
    enum: EstadoModeracion,
    default: EstadoModeracion.PENDIENTE,
  })
  @IsEnum(EstadoModeracion)
  estado: EstadoModeracion;

  @ApiProperty({
    description: 'Comentario del moderador (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  comentario_moderador?: string;
}
