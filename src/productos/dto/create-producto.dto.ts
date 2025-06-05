import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  Matches,
  Min,
  Max,
  IsPositive,
} from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({
    description: 'Nombre del producto o servicio',
    example: 'Laptop HP Pavilion 15-eh1001la',
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @Length(3, 100, {
    message: 'El nombre debe tener entre 3 y 100 caracteres',
  })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/, {
    message:
      'El nombre solo puede contener letras, números, espacios, guiones y puntos',
  })
  nombre: string;

  @ApiProperty({
    description: 'Precio del producto o servicio en soles peruanos',
    example: 2499.99,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo 2 decimales' },
  )
  @IsPositive({ message: 'El precio debe ser un número positivo' })
  @Min(0.01, { message: 'El precio mínimo es S/ 0.01' })
  @Max(1000000, { message: 'El precio máximo es S/ 1,000,000' })
  precio: number;

  @ApiProperty({
    description: 'ID de la categoría del producto',
    example: 1,
    minimum: 1,
  })
  @IsNumber({}, { message: 'El ID de categoría debe ser un número' })
  @IsPositive({ message: 'El ID de categoría debe ser un número positivo' })
  id_categoria: number;

  @ApiProperty({
    description: 'ID de la subcategoría del producto (opcional)',
    example: 5,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID de subcategoría debe ser un número' })
  @IsPositive({
    message: 'El ID de subcategoría debe ser un número positivo',
  })
  id_subcategoria?: number;

  @ApiProperty({
    description:
      'Indica si es un servicio (true) o producto físico (false)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo es_servicio debe ser verdadero o falso' })
  es_servicio?: boolean = false;
}
