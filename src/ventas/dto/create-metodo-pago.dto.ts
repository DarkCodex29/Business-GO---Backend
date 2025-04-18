import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDecimal,
} from 'class-validator';

export class CreateMetodoPagoDto {
  @ApiProperty({
    description: 'Nombre del método de pago',
    example: 'Tarjeta de crédito',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del método de pago',
    example: 'Pago con tarjeta de crédito',
    required: false,
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Tipo de pago',
    example: 'tarjeta',
  })
  @IsString()
  @IsNotEmpty()
  tipo_pago: string;

  @ApiProperty({
    description: 'Indica si tiene comisión',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  tiene_comision?: boolean;

  @ApiProperty({
    description: 'Porcentaje de comisión',
    example: 2.5,
    required: false,
  })
  @IsDecimal()
  @IsOptional()
  porcentaje_comision?: number;
}
