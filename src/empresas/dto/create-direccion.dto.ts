import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDecimal,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDireccionDto {
  @ApiProperty({ description: 'ID de la empresa' })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({ description: 'Dirección física' })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({ description: 'Departamento' })
  @IsString()
  @IsNotEmpty()
  departamento: string;

  @ApiProperty({ description: 'Provincia' })
  @IsString()
  @IsNotEmpty()
  provincia: string;

  @ApiProperty({ description: 'Distrito' })
  @IsString()
  @IsNotEmpty()
  distrito: string;

  @ApiProperty({
    description: 'Tipo de dirección',
    example: 'principal',
    required: false,
  })
  @IsString()
  @IsOptional()
  tipo_direccion?: string;

  @ApiProperty({
    description: 'Código postal',
    example: '15046',
    required: false,
  })
  @IsString()
  @IsOptional()
  codigo_postal?: string;

  @ApiProperty({
    description: 'Referencia de la dirección',
    example: 'Cerca al parque Kennedy',
    required: false,
  })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiProperty({
    description: 'Latitud de la ubicación',
    example: -12.0464,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  @IsDecimal({ decimal_digits: '6' })
  @Min(-90)
  @Max(90)
  latitud: number;

  @ApiProperty({
    description: 'Longitud de la ubicación',
    example: -77.0428,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  @IsDecimal({ decimal_digits: '6' })
  @Min(-180)
  @Max(180)
  longitud: number;
}
