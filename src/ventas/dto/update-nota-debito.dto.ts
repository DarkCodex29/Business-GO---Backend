import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export enum EstadoNotaDebito {
  EMITIDA = 'EMITIDA',
  ANULADA = 'ANULADA',
}

export class UpdateNotaDebitoDto {
  @ApiProperty({
    description: 'Estado de la nota de débito',
    enum: EstadoNotaDebito,
    example: EstadoNotaDebito.EMITIDA,
    required: false,
  })
  @IsEnum(EstadoNotaDebito)
  @IsOptional()
  estado?: EstadoNotaDebito;

  @ApiProperty({
    description: 'Motivo de la nota de débito',
    example: 'Ajuste por diferencia de precio',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  motivo?: string;
}
