import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  IsDate,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateItemNotaCreditoDto } from './create-item-nota-credito.dto';

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

export class CreateNotaCreditoDto {
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

  @ApiProperty({ description: 'Número de la nota de crédito' })
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

  @ApiProperty({
    description: 'Tipo de nota de crédito',
    enum: TipoNotaCredito,
  })
  @IsEnum(TipoNotaCredito)
  @IsNotEmpty()
  tipo: TipoNotaCredito;

  @ApiProperty({
    description: 'Estado de la nota de crédito',
    enum: EstadoNotaCredito,
  })
  @IsEnum(EstadoNotaCredito)
  @IsNotEmpty()
  estado: EstadoNotaCredito;

  @ApiProperty({
    description: 'Items de la nota de crédito',
    type: [CreateItemNotaCreditoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemNotaCreditoDto)
  items: CreateItemNotaCreditoDto[];

  @ApiProperty({ description: 'Motivo de la nota de crédito' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ description: 'Observaciones adicionales', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ description: 'Moneda de la nota de crédito' })
  @IsString()
  @IsNotEmpty()
  moneda: string;

  @ApiProperty({ description: 'Tipo de cambio', required: false })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  tipo_cambio?: number;
}
