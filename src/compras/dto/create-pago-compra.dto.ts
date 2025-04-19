import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePagoCompraDto {
  @ApiProperty({ description: 'Fecha de pago', example: '2023-12-01' })
  @IsDate()
  @Type(() => Date)
  fecha_pago: Date;

  @ApiProperty({ description: 'Monto del pago', example: 500.0 })
  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @ApiProperty({ description: 'Método de pago', example: 'transferencia' })
  @IsString()
  @IsNotEmpty()
  metodo_pago: string;

  @ApiProperty({
    description: 'Número de comprobante',
    example: 'COMP-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  numero_comprobante?: string;

  @ApiProperty({
    description: 'Estado del pago',
    example: 'pendiente',
    required: false,
  })
  @IsOptional()
  @IsString()
  estado?: string;
}
