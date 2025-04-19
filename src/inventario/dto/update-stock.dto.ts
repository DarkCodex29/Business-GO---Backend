import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateInventarioStockDto {
  @ApiProperty({
    description: 'Cantidad de stock a actualizar',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  cantidad: number;
}
