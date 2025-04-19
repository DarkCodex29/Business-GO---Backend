import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({
    description: 'Nombre del producto o servicio',
    example: 'Laptop HP',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Precio del producto o servicio',
    example: 999.99,
  })
  @IsNumber()
  precio: number;

  @ApiProperty({
    description: 'ID de la categoría',
    example: 1,
  })
  @IsNumber()
  id_categoria: number;

  @ApiProperty({
    description: 'ID de la subcategoría',
    example: 1,
  })
  @IsNumber()
  id_subcategoria: number;

  @ApiProperty({
    description: 'Indica si es un servicio',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  es_servicio?: boolean;
}
