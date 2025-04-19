import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCategoriaDto {
  @ApiProperty({ description: 'Nombre de la categoría', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;
}
