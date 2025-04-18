import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt } from 'class-validator';

export class CreateSubcategoriaDto {
  @ApiProperty({
    description: 'Nombre de la subcategoría',
    example: 'Laptops',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'ID de la categoría a la que pertenece la subcategoría',
    example: 1,
  })
  @IsInt()
  id_categoria: number;
}
