import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateStockDto {
  @ApiProperty({
    description: 'ID del producto',
    example: 1,
  })
  @IsNumber()
  id_producto: number;

  @ApiProperty({
    description: 'Cantidad en stock',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  cantidad: number;

  @ApiProperty({
    description: 'ID de la sucursal',
    example: 1,
  })
  @IsNumber()
  id_sucursal: number;

  @ApiProperty({
    description: 'Cantidad mínima',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  cantidad_minima: number;

  @ApiProperty({
    description: 'Ubicación en almacén',
    example: 'Estante A-1',
    required: false,
  })
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @ApiProperty({
    description: 'Notas sobre el stock',
    example: 'Stock de temporada',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
