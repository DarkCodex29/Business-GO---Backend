import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class CreateValoracionDto {
  @ApiProperty({
    description: 'Calificación del producto (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiProperty({
    description: 'Comentario sobre la valoración',
    maxLength: 500,
  })
  @IsString()
  @Max(500)
  @IsOptional()
  comentario?: string;

  @ApiProperty({
    description: 'ID del cliente que realiza la valoración',
  })
  @IsNumber()
  id_cliente: number;

  @ApiProperty({
    description: 'ID del producto valorado',
  })
  @IsNumber()
  id_producto: number;
}
