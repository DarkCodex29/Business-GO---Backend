import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateDisponibilidadDto {
  @ApiProperty({
    description: 'ID del producto',
    example: 1,
  })
  @IsInt()
  id_producto: number;

  @ApiProperty({
    description: 'Cantidad disponible',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  cantidad_disponible: number;
}
