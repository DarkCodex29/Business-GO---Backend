import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({
    description: 'Nombre del producto o servicio',
    example: 'Laptop HP 15"',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Precio del producto o servicio',
    example: 1299.99,
  })
  @IsNumber()
  precio: number;

  @ApiProperty({
    description: 'ID de la empresa a la que pertenece el producto',
    example: 1,
  })
  @IsInt()
  id_empresa: number;

  @ApiProperty({
    description: 'ID de la categoría del producto',
    example: 1,
  })
  @IsInt()
  id_categoria: number;

  @ApiProperty({
    description: 'ID de la subcategoría del producto (opcional)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  id_subcategoria?: number;

  @ApiProperty({
    description: 'Indica si es un servicio (true) o un producto (false)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_servicio?: boolean;
}
