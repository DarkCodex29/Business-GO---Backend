import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateFidelizacionDto {
  @ApiProperty({
    description:
      'ID del cliente al que se asignará el programa de fidelización',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  clienteId: string;

  @ApiProperty({
    description: 'Nombre del programa de fidelización',
    example: 'Programa Premium',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del programa',
    example: 'Programa de fidelización premium con beneficios exclusivos',
  })
  @IsString()
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
    description: 'Fecha de inicio del programa',
    example: '2024-03-20',
    required: false,
  })
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @ApiProperty({
    description: 'Fecha de expiración del programa',
    example: '2025-03-20',
    required: false,
  })
  @IsOptional()
  @IsString()
  fechaExpiracion?: string;

  @ApiProperty({
    description: 'Indica si el programa está activo',
    example: true,
    default: true,
  })
  @IsBoolean()
  activo: boolean;

  @ApiProperty({
    description: 'Beneficios del programa en formato JSON',
    example: { descuento: '10%', envioGratis: true },
    required: false,
  })
  @IsOptional()
  @IsString()
  beneficios?: string;
}
