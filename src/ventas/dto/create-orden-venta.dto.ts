import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoOrdenVenta {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
  FACTURADA = 'FACTURADA',
}

export class ItemOrdenVentaDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsNumber()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({ example: 5, description: 'Cantidad del producto' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({ example: 100.5, description: 'Precio unitario del producto' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precio_unitario: number;

  @ApiProperty({ example: 10.0, description: 'Descuento aplicado al item' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;
}

export class CreateOrdenVentaDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa' })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsNumber()
  @IsNotEmpty()
  id_cliente: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la cotización (opcional)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  id_cotizacion?: number;

  @ApiProperty({
    example: 'PENDIENTE',
    description: 'Estado de la orden de venta',
    enum: EstadoOrdenVenta,
  })
  @IsEnum(EstadoOrdenVenta)
  @IsNotEmpty()
  estado: EstadoOrdenVenta;

  @ApiProperty({
    type: [ItemOrdenVentaDto],
    description: 'Items de la orden de venta',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenVentaDto)
  items: ItemOrdenVentaDto[];

  @ApiProperty({
    example: 'Entrega urgente',
    description: 'Notas adicionales',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
