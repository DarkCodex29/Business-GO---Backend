import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  Length,
  IsEnum,
} from 'class-validator';

export enum TipoMovimientoStock {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE = 'AJUSTE',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export class UpdateInventarioStockDto {
  @ApiProperty({
    description: 'Cantidad de stock a actualizar (unidades)',
    example: 100,
    minimum: 0,
    maximum: 999999,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  @Max(999999, { message: 'La cantidad no puede exceder 999,999 unidades' })
  cantidad: number;

  @ApiProperty({
    description: 'Motivo del cambio de stock',
    example: 'Ajuste por inventario físico',
    minLength: 5,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El motivo debe ser una cadena de texto' })
  @Length(5, 200, {
    message: 'El motivo debe tener entre 5 y 200 caracteres',
  })
  motivo?: string = 'Ajuste manual desde inventario';

  @ApiProperty({
    description: 'Tipo de movimiento de stock',
    enum: TipoMovimientoStock,
    example: TipoMovimientoStock.AJUSTE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TipoMovimientoStock, {
    message:
      'El tipo de movimiento debe ser: ENTRADA, SALIDA, AJUSTE o TRANSFERENCIA',
  })
  tipo?: TipoMovimientoStock = TipoMovimientoStock.AJUSTE;
}
