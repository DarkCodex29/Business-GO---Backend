import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateSubcategoriaDto {
  @ApiProperty({
    description: 'Nombre de la subcategoría',
    example: 'Smartphones',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombre?: string;
}
