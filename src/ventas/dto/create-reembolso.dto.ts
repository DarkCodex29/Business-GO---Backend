import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateReembolsoDto {
  @ApiProperty({ description: 'ID del pago a reembolsar' })
  @IsNumber()
  @IsNotEmpty()
  id_pago: number;

  @ApiProperty({ description: 'Monto del reembolso' })
  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @ApiProperty({ description: 'Motivo del reembolso' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({
    description: 'Notas adicionales sobre el reembolso',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
