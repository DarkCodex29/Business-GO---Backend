import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export enum TipoFeedback {
  SUGERENCIA = 'sugerencia',
  QUEJA = 'queja',
  RECLAMO = 'reclamo',
  FELICITACION = 'felicitacion',
}

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'ID del cliente que proporciona el feedback',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  clienteId: string;

  @ApiProperty({
    description: 'Tipo de feedback',
    enum: TipoFeedback,
    example: TipoFeedback.SUGERENCIA,
  })
  @IsEnum(TipoFeedback)
  tipo: TipoFeedback;

  @ApiProperty({
    description: 'Título del feedback',
    example: 'Mejora en la atención al cliente',
  })
  @IsString()
  titulo: string;

  @ApiProperty({
    description: 'Descripción detallada del feedback',
    example:
      'La atención fue excelente, pero sugiero mejorar los tiempos de respuesta',
  })
  @IsString()
  descripcion: string;

  @ApiProperty({
    description: 'Calificación del servicio (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  calificacion?: number;

  @ApiProperty({
    description: 'ID de la orden o servicio relacionado (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  ordenId?: string;
}
