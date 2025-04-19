import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoNotaCredito {
  ANULACION = 'ANULACION',
  DESCUENTO = 'DESCUENTO',
  DEVOLUCION = 'DEVOLUCION',
  OTROS = 'OTROS',
}

export enum EstadoNotaCredito {
  PENDIENTE = 'PENDIENTE',
  APLICADA = 'APLICADA',
  CANCELADA = 'CANCELADA',
}

export class ItemNotaCreditoDto {
  @ApiProperty({
    description: 'ID del producto',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({
    description: 'Precio unitario del producto',
    example: 100.5,
  })
  @IsNumber()
  @IsNotEmpty()
  precio_unitario: number;

  @ApiProperty({
    description: 'Porcentaje de IGV',
    example: 18,
  })
  @IsNumber()
  @IsNotEmpty()
  igv_porcentaje: number;
}

export class CreateNotaCreditoDto {
  @ApiProperty({
    description: 'ID de la factura asociada',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_factura: number;

  @ApiProperty({
    description: 'Motivo de la nota de crédito',
    example: 'Devolución por producto defectuoso',
  })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({
    description: 'Items de la nota de crédito',
    type: [ItemNotaCreditoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemNotaCreditoDto)
  items: ItemNotaCreditoDto[];
}
