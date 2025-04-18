import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDateString,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoCotizacion {
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  VENCIDA = 'vencida',
  CONVERTIDA = 'convertida',
}

export class ItemCotizacionDto {
  @ApiProperty({ example: 1, description: 'ID del producto o servicio' })
  @IsNumber()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({ example: 2, description: 'Cantidad del producto' })
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
  @IsNotEmpty()
  descuento: number;

  @ApiProperty({
    example: 191.0,
    description: 'Subtotal del item (cantidad * precio_unitario - descuento)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  subtotal: number;
}

export class CreateCotizacionDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa' })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsNumber()
  @IsNotEmpty()
  id_cliente: number;

  @ApiProperty({
    example: '2024-03-15',
    description: 'Fecha de emisión de la cotización',
  })
  @IsDateString()
  @IsNotEmpty()
  fecha_emision: string;

  @ApiProperty({
    example: '2024-04-15',
    description: 'Fecha de validez de la cotización',
  })
  @IsDateString()
  @IsNotEmpty()
  fecha_validez: string;

  @ApiProperty({ example: 1000.0, description: 'Subtotal de la cotización' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  subtotal: number;

  @ApiProperty({ example: 100.0, description: 'Descuento total aplicado' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  descuento: number;

  @ApiProperty({ example: 180.0, description: 'IGV calculado' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  igv: number;

  @ApiProperty({ example: 1080.0, description: 'Total de la cotización' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  total: number;

  @ApiProperty({
    enum: EstadoCotizacion,
    example: EstadoCotizacion.PENDIENTE,
    description: 'Estado de la cotización',
  })
  @IsEnum(EstadoCotizacion)
  @IsNotEmpty()
  estado: EstadoCotizacion;

  @ApiProperty({
    example: 'Cotización para proyecto de desarrollo web',
    description: 'Notas adicionales',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiProperty({
    type: [ItemCotizacionDto],
    description: 'Items de la cotización',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemCotizacionDto)
  items: ItemCotizacionDto[];
}
