import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  Max,
  Length,
  IsPositive,
} from 'class-validator';

export enum TipoMovimientoStock {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE = 'AJUSTE',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export class MovimientoStockDto {
  @ApiProperty({
    description: 'ID del producto a mover',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: 'El ID del producto debe ser un número entero' })
  @IsPositive({ message: 'El ID del producto debe ser un número positivo' })
  producto_id: number;

  @ApiProperty({
    description: 'Cantidad a mover (unidades)',
    example: 25,
    minimum: 1,
    maximum: 999999,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(999999, { message: 'La cantidad no puede exceder 999,999 unidades' })
  cantidad: number;

  @ApiProperty({
    description: 'Tipo de movimiento de inventario',
    enum: TipoMovimientoStock,
    example: TipoMovimientoStock.ENTRADA,
  })
  @IsEnum(TipoMovimientoStock, {
    message: 'El tipo debe ser: ENTRADA, SALIDA, AJUSTE o TRANSFERENCIA',
  })
  tipo: TipoMovimientoStock;

  @ApiProperty({
    description: 'Motivo detallado del movimiento',
    example: 'Recepción de mercadería del proveedor ABC SAC',
    minLength: 5,
    maxLength: 200,
  })
  @IsString({ message: 'El motivo debe ser una cadena de texto' })
  @Length(5, 200, {
    message: 'El motivo debe tener entre 5 y 200 caracteres',
  })
  motivo: string;

  @ApiProperty({
    description: 'Número de documento relacionado (opcional)',
    example: 'GR-2024-001',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser texto' })
  @Length(1, 50, {
    message: 'El número de documento no puede exceder 50 caracteres',
  })
  numero_documento?: string;

  @ApiProperty({
    description: 'Observaciones adicionales (opcional)',
    example: 'Productos en buen estado, verificado por almacén',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @Length(1, 500, {
    message: 'Las observaciones no pueden exceder 500 caracteres',
  })
  observaciones?: string;
}

export class MovimientoMasivoStockDto {
  @ApiProperty({
    description: 'Lista de movimientos de stock a procesar',
    type: [MovimientoStockDto],
    minItems: 1,
    maxItems: 50,
  })
  movimientos: MovimientoStockDto[];

  @ApiProperty({
    description: 'Motivo general para todos los movimientos',
    example: 'Inventario físico mensual - Enero 2024',
    minLength: 5,
    maxLength: 200,
  })
  @IsString({ message: 'El motivo general debe ser texto' })
  @Length(5, 200, {
    message: 'El motivo general debe tener entre 5 y 200 caracteres',
  })
  motivo_general: string;
}
