import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemOrdenCompraDto {
  @ApiProperty({ description: 'ID del producto', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({ description: 'Cantidad del producto', example: 5 })
  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario del producto', example: 100.5 })
  @IsNumber()
  @IsNotEmpty()
  precio_unitario: number;

  @ApiProperty({
    description: 'Fecha de entrega del producto',
    example: '2023-12-31',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_entrega?: Date;
}

export class CreateOrdenCompraDto {
  @ApiProperty({ description: 'ID del proveedor', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  id_proveedor: number;

  @ApiProperty({ description: 'Número de orden', example: 'OC-2023-001' })
  @IsString()
  @IsNotEmpty()
  numero_orden: string;

  @ApiProperty({
    description: 'Fecha de entrega',
    example: '2023-12-31',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_entrega?: Date;

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Entrega urgente',
    required: false,
  })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({
    description: 'Items de la orden de compra',
    type: [ItemOrdenCompraDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenCompraDto)
  items: ItemOrdenCompraDto[];
}
