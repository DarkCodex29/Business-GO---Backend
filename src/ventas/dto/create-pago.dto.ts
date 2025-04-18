import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePagoDto {
  @ApiProperty({ description: 'ID del historial de compra' })
  @IsNumber()
  id_historial: number;

  @ApiProperty({ description: 'ID del método de pago' })
  @IsNumber()
  id_metodo_pago: number;

  @ApiProperty({ description: 'Monto del pago' })
  @IsNumber()
  monto: number;

  @ApiProperty({ description: 'Estado del pago', required: false })
  @IsString()
  @IsOptional()
  estado_pago?: string;

  @ApiProperty({ description: 'ID del usuario que realiza el pago' })
  @IsNumber()
  id_usuario: number;
}
