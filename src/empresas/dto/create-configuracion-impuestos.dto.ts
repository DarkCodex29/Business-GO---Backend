import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreateConfiguracionImpuestosDto {
  @ApiProperty({
    description: 'Tasa de IVA (porcentaje)',
    example: 18,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  tasa_iva: number;

  @ApiProperty({
    description: 'Tasa de ISC (porcentaje)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  tasa_isc: number;

  @ApiProperty({
    description: 'Tasa de IGV (porcentaje)',
    example: 18,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  tasa_igv: number;

  @ApiProperty({
    description: 'Redondeo a aplicar en los cálculos',
    example: 2,
    minimum: 0,
    maximum: 4,
  })
  @IsNumber()
  @Min(0)
  @Max(4)
  redondeo: number;

  @ApiProperty({
    description: 'Indica si los impuestos están incluidos en los precios',
    example: true,
  })
  @IsBoolean()
  incluir_impuestos: boolean;
}
