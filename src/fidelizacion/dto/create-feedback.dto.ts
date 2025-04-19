import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export enum TipoFeedback {
  SUGERENCIA = 'sugerencia',
  QUEJA = 'queja',
  RECLAMO = 'reclamo',
  FELICITACION = 'felicitacion',
}

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Tipo de feedback',
    enum: TipoFeedback,
    example: TipoFeedback.SUGERENCIA,
  })
  @IsEnum(TipoFeedback)
  @IsNotEmpty()
  tipo: TipoFeedback;

  @ApiProperty({
    description: 'Título del feedback',
    example: 'Mejora en la atención al cliente',
  })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({
    description: 'Descripción detallada del feedback',
    example:
      'La atención fue excelente, pero sugiero mejorar los tiempos de respuesta',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({
    description: 'Calificación del servicio (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiProperty({
    description: 'ID del pedido relacionado (opcional)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  pedidoId?: number;

  @ApiProperty({
    description: 'Categoría del feedback',
    example: 'SERVICIO',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoria?: string;
}
