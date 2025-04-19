import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum EstadoNotaCredito {
  EMITIDA = 'EMITIDA',
  ANULADA = 'ANULADA',
}

export class UpdateNotaCreditoDto {
  @ApiProperty({
    description: 'Estado de la nota de crédito',
    enum: EstadoNotaCredito,
    example: EstadoNotaCredito.EMITIDA,
    required: false,
  })
  @IsEnum(EstadoNotaCredito)
  @IsOptional()
  estado?: EstadoNotaCredito;

  @ApiProperty({
    description: 'Motivo de la nota de crédito',
    example: 'Devolución por producto defectuoso',
    required: false,
  })
  @IsString()
  @IsOptional()
  motivo?: string;
}
