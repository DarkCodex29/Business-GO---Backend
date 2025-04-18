import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateReembolsoDto {
  @ApiProperty({ description: 'ID del pago a reembolsar' })
  @IsNumber()
  id_pago: number;

  @ApiProperty({ description: 'Monto a reembolsar' })
  @IsNumber()
  monto: number;

  @ApiProperty({ description: 'Motivo del reembolso' })
  @IsString()
  motivo: string;
}
