import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateConfiguracionMonedaDto {
  @ApiProperty({
    description: 'Moneda principal de la empresa',
    example: 'PEN',
  })
  @IsString()
  @IsNotEmpty()
  moneda_principal: string;

  @ApiProperty({
    description: 'Moneda secundaria de la empresa',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  moneda_secundaria: string;

  @ApiProperty({
    description: 'Tipo de cambio',
    example: 3.75,
    minimum: 0,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  tipo_cambio: number;

  @ApiProperty({
    description: 'Redondeo de moneda',
    example: 2,
    minimum: 0,
    maximum: 4,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(4)
  redondeo: number;

  @ApiProperty({
    description: 'Formato de moneda',
    example: '$ #,##0.00',
  })
  @IsString()
  @IsNotEmpty()
  formato_moneda: string;
}
