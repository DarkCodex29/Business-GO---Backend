import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdatePuntosFidelizacionDto {
  @ApiProperty({
    description: 'Cantidad de puntos a agregar o restar',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  puntos: number;

  @ApiProperty({
    description: 'Motivo de la actualización de puntos',
    example: 'Compra realizada',
  })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({
    description: 'ID del pedido relacionado (opcional)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  pedidoId?: number;

  @ApiProperty({
    description: 'Notas adicionales sobre la actualización',
    example: 'Puntos por compra mayor a $100',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
