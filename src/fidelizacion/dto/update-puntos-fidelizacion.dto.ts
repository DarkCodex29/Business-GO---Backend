import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString } from 'class-validator';

export class UpdatePuntosFidelizacionDto {
  @ApiProperty({
    description: 'Puntos actuales del cliente',
    example: 100,
  })
  @IsNumber()
  puntos_actuales: number;

  @ApiProperty({
    description: 'Fecha de fin del programa de fidelización',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string;
}
