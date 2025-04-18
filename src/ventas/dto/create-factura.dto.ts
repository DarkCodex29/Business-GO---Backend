import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoFactura {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
  VENCIDA = 'VENCIDA',
}

export class ItemFacturaDto {
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

  @ApiProperty({ example: 18, description: 'Porcentaje de IGV aplicado' })
  @IsNumber()
  @IsNotEmpty()
  igv_porcentaje: number;
}

export class CreateFacturaDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la orden de venta relacionada',
  })
  @IsNumber()
  @IsNotEmpty()
  id_orden_venta: number;

  @ApiProperty({ example: 1, description: 'ID de la empresa' })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsNumber()
  @IsNotEmpty()
  id_cliente: number;

  @ApiProperty({ example: 'F001-00000001', description: 'Número de factura' })
  @IsString()
  @IsNotEmpty()
  numero_factura: string;

  @ApiProperty({ example: '2024-03-15', description: 'Fecha de emisión' })
  @IsDateString()
  @IsNotEmpty()
  fecha_emision: string;

  @ApiProperty({ example: '2024-04-15', description: 'Fecha de vencimiento' })
  @IsDateString()
  @IsNotEmpty()
  fecha_vencimiento: string;

  @ApiProperty({
    enum: EstadoFactura,
    example: EstadoFactura.PENDIENTE,
    description: 'Estado de la factura',
  })
  @IsEnum(EstadoFactura)
  @IsNotEmpty()
  estado: EstadoFactura;

  @ApiProperty({
    type: [ItemFacturaDto],
    description: 'Items de la factura',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemFacturaDto)
  items: ItemFacturaDto[];

  @ApiProperty({
    example: 'Factura por servicios prestados',
    description: 'Observaciones',
    required: false,
  })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({
    example: 30,
    description: 'Días de crédito otorgados',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dias_credito?: number;

  @ApiProperty({ example: 'USD', description: 'Moneda de la factura' })
  @IsString()
  @IsNotEmpty()
  moneda: string;

  @ApiProperty({
    example: 3.5,
    description: 'Tipo de cambio aplicado si la moneda es diferente a la local',
  })
  @IsNumber()
  @IsOptional()
  tipo_cambio?: number;
}
