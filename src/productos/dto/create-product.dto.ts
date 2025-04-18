import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Laptop HP 15"',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del producto',
    example: 'Laptop HP con procesador Intel i5, 8GB RAM, 256GB SSD',
  })
  @IsString()
  descripcion: string;

  @ApiProperty({
    description: 'Código único del producto',
    example: 'LAP-001',
  })
  @IsString()
  codigo: string;

  @ApiProperty({
    description: 'ID de la categoría',
    example: 1,
  })
  @IsNumber()
  id_categoria: number;

  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
  })
  @IsNumber()
  id_empresa: number;

  @ApiProperty({
    description: 'Estado del producto',
    example: true,
  })
  @IsBoolean()
  estado: boolean;

  @ApiProperty({
    description: 'URL de la imagen del producto',
    example: 'https://example.com/images/laptop.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  imagen_url?: string;

  @ApiProperty({
    description: 'Atributos del producto',
    example: {
      color: 'Negro',
      peso: '2.5kg',
      dimensiones: '35x24x2.5cm',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  atributos?: Record<string, any>;

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Producto con garantía de 1 año',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
