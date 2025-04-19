import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoNotaDebito {
  INTERES = 'INTERES',
  MORA = 'MORA',
  OTROS = 'OTROS',
}

export enum EstadoNotaDebito {
  PENDIENTE = 'PENDIENTE',
  APLICADA = 'APLICADA',
  CANCELADA = 'CANCELADA',
}

export class ItemNotaDebitoDto {
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
  @Min(1)
  cantidad: number;

  @ApiProperty({
    description: 'Precio unitario del producto',
    example: 100.5,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  precio_unitario: number;

  @ApiProperty({
    description: 'Porcentaje de IGV',
    example: 18,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  igv_porcentaje: number;
}

export class CreateNotaDebitoDto {
  @ApiProperty({
    description: 'ID de la factura asociada',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_factura: number;

  @ApiProperty({
    description: 'Motivo de la nota de débito',
    example: 'Ajuste por diferencia de precio',
  })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({
    description: 'Items de la nota de débito',
    type: [ItemNotaDebitoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemNotaDebitoDto)
  items: ItemNotaDebitoDto[];
}
