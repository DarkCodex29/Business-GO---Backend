import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
  IsDateString,
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
    description: 'Puntos iniciales del cliente',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  puntosIniciales: number;

  @ApiProperty({
    description: 'Nivel del cliente en el programa',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  nivel: number;

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
    description: 'Fecha de inicio del programa',
    example: '2024-03-20',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiProperty({
    description: 'Fecha de expiración del programa',
    example: '2025-03-20',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string;

  @ApiProperty({
    description: 'Indica si el programa está activo',
    example: true,
    default: true,
  })
  @IsBoolean()
  activo: boolean;

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
    description: 'Beneficios del programa en formato JSON',
    example: { descuento: '10%', envioGratis: true },
    required: false,
  })
  @IsString()
  @IsOptional()
  beneficios?: string;
}
