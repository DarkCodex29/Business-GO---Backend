import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class UpdateValoracionDto {
  @ApiProperty({
    description: 'Puntuación del producto (1-5)',
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  puntuacion?: number;

  @ApiProperty({
    description: 'Comentario sobre la valoración',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @Max(500)
  @IsOptional()
  comentario?: string;
}
