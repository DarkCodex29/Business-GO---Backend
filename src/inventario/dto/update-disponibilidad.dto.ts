import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateInventarioDisponibilidadDto {
  @ApiProperty({
    description: 'Estado de disponibilidad del producto',
    example: true,
  })
  @IsBoolean()
  disponible: boolean;
}
