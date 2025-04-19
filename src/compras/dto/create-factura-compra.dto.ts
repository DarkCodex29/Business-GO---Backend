import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFacturaCompraDto {
  @ApiProperty({ description: 'Número de factura', example: 'F-2023-001' })
  @IsString()
  @IsNotEmpty()
  numero_factura: string;

  @ApiProperty({ description: 'Fecha de emisión', example: '2023-12-01' })
  @IsDate()
  @Type(() => Date)
  fecha_emision: Date;

  @ApiProperty({ description: 'Subtotal de la factura', example: 1000.0 })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @ApiProperty({ description: 'IGV de la factura', example: 180.0 })
  @IsNumber()
  @IsNotEmpty()
  igv: number;

  @ApiProperty({ description: 'Total de la factura', example: 1180.0 })
  @IsNumber()
  @IsNotEmpty()
  total: number;

  @ApiProperty({
    description: 'Estado de la factura',
    example: 'pendiente',
    required: false,
  })
  @IsOptional()
  @IsString()
  estado?: string;
}
