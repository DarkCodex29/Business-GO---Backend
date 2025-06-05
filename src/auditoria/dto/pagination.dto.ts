import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Número de página (por defecto: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página (por defecto: 10, máximo: 100)',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite no puede ser mayor a 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar',
    example: 'fecha_evento',
    default: 'fecha_evento',
    required: false,
  })
  @IsOptional()
  orderBy?: string = 'fecha_evento';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  orderDirection?: 'asc' | 'desc' = 'desc';
}
