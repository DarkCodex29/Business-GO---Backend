import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateValoracionDto {
  @ApiProperty({
    description: 'ID del cliente que realiza la valoración',
    example: 1,
  })
  @IsInt()
  id_cliente: number;

  @ApiProperty({
    description: 'ID del producto valorado',
    example: 1,
  })
  @IsInt()
  id_producto: number;

  @ApiProperty({
    description: 'Calificación del producto (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiProperty({
    description: 'Comentario sobre el producto',
    example: 'Excelente producto, muy buena calidad',
    required: false,
  })
  @IsString()
  @IsOptional()
  comentario?: string;
}
