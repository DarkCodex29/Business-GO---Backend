import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemNotaDebitoDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  @IsPositive()
  id_producto: number;

  @ApiProperty({ description: 'Cantidad del producto' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario del producto' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_unitario: number;

  @ApiProperty({ description: 'Porcentaje de IGV aplicado' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  igv_porcentaje: number;

  @ApiProperty({ description: 'Descripción del item', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
