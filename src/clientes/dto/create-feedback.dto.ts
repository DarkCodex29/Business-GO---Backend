import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Calificación del servicio (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiProperty({
    description: 'Comentario del cliente',
    example: 'Excelente servicio, muy satisfecho con la atención',
  })
  @IsString()
  @IsNotEmpty()
  comentario: string;

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
