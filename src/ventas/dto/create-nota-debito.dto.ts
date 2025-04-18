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
  IsDate,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateItemNotaDebitoDto } from './create-item-nota-debito.dto';

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
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsNumber()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({ example: 2, description: 'Cantidad del producto a ajustar' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({ example: 100.5, description: 'Precio unitario del producto' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precio_unitario: number;

  @ApiProperty({ example: 18, description: 'Porcentaje de IGV aplicado' })
  @IsNumber()
  @IsNotEmpty()
  igv_porcentaje: number;
}

export class CreateNotaDebitoDto {
  @ApiProperty({ description: 'ID de la factura asociada' })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_factura: number;

  @ApiProperty({ description: 'ID de la empresa' })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({ description: 'ID del cliente' })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_cliente: number;

  @ApiProperty({ description: 'Número de la nota de débito' })
  @IsString()
  @IsNotEmpty()
  numero_nota: string;

  @ApiProperty({ description: 'Fecha de emisión' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  fecha_emision: Date;

  @ApiProperty({ description: 'Fecha de vencimiento' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  fecha_vencimiento: Date;

  @ApiProperty({ description: 'Tipo de nota de débito', enum: TipoNotaDebito })
  @IsEnum(TipoNotaDebito)
  @IsNotEmpty()
  tipo: TipoNotaDebito;

  @ApiProperty({
    description: 'Estado de la nota de débito',
    enum: EstadoNotaDebito,
  })
  @IsEnum(EstadoNotaDebito)
  @IsNotEmpty()
  estado: EstadoNotaDebito;

  @ApiProperty({
    description: 'Items de la nota de débito',
    type: [CreateItemNotaDebitoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemNotaDebitoDto)
  items: CreateItemNotaDebitoDto[];

  @ApiProperty({ description: 'Motivo de la nota de débito' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ description: 'Observaciones adicionales', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ description: 'Moneda de la nota de débito' })
  @IsString()
  @IsNotEmpty()
  moneda: string;

  @ApiProperty({ description: 'Tipo de cambio', required: false })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  tipo_cambio?: number;

  @ApiProperty({ description: 'Tasa de interés aplicada', required: false })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  tasa_interes?: number;

  @ApiProperty({ description: 'Días de retraso', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  dias_retraso?: number;
}
