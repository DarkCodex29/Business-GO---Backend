import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class UpdateInventarioDisponibilidadDto {
  @ApiProperty({
    description: 'Cantidad disponible del producto para venta (unidades)',
    example: 50,
    minimum: 0,
    maximum: 999999,
  })
  @IsInt({ message: 'La cantidad disponible debe ser un número entero' })
  @Min(0, { message: 'La cantidad disponible no puede ser negativa' })
  @Max(999999, {
    message: 'La cantidad disponible no puede exceder 999,999 unidades',
  })
  cantidad_disponible: number;
}
