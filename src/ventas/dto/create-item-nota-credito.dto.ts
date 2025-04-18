import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemNotaCreditoDto {
  @IsInt()
  @IsPositive()
  id_producto: number;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_unitario: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  igv_porcentaje: number;
}
