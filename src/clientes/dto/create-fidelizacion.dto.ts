import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateFidelizacionDto {
  @ApiProperty({
    description: 'Nombre del programa de fidelización',
    example: 'Programa Premium',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del programa',
    example: 'Programa de fidelización para clientes premium',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({
    description: 'Puntos por cada compra (porcentaje)',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  puntosPorCompra: number;

  @ApiProperty({
    description: 'Valor de cada punto en moneda local',
    example: 0.1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  valorPunto: number;

  @ApiProperty({
    description: 'Nivel mínimo de puntos para ser considerado cliente fiel',
    example: 1000,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  nivelMinimoPuntos?: number;

  @ApiProperty({
    description: 'Beneficios del programa',
    example: 'Descuentos exclusivos, atención prioritaria',
    required: false,
  })
  @IsString()
  @IsOptional()
  beneficios?: string;
}
