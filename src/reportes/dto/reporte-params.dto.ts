import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class ReporteParamsDto {
  @ApiProperty({
    description: 'Fecha de inicio del reporte',
    example: '2023-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @ApiProperty({
    description: 'Fecha de fin del reporte',
    example: '2023-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @ApiProperty({
    description: 'Incluir productos con stock bajo',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  incluir_bajos?: boolean;

  @ApiProperty({
    description: 'Umbral mínimo de stock para considerar un producto como bajo',
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  umbral_minimo?: number;
}
