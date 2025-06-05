import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
} from 'class-validator';
import { EstadoPago } from '../../common/enums/estados.enum';

export class CreatePagoSuscripcionDto {
  @ApiProperty({
    description: 'ID de la suscripción',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_suscripcion: number;

  @ApiProperty({
    description: 'Monto del pago en soles peruanos',
    example: 99.0,
  })
  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @ApiProperty({
    description: 'Método de pago utilizado',
    example: 'Yape',
  })
  @IsString()
  @IsNotEmpty()
  metodo_pago: string;

  @ApiProperty({
    description: 'Estado del pago',
    enum: EstadoPago,
    example: EstadoPago.COMPLETADO,
    required: false,
  })
  @IsEnum(EstadoPago)
  @IsOptional()
  estado_pago?: EstadoPago;

  @ApiProperty({
    description:
      'Referencia externa del pago (ID de Culqi, Mercado Pago, etc.)',
    example: 'txn_1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  referencia_externa?: string;

  @ApiProperty({
    description: 'Fecha de inicio del período',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  periodo_inicio: string;

  @ApiProperty({
    description: 'Fecha de fin del período',
    example: '2024-01-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  periodo_fin: string;

  @ApiProperty({
    description: 'URL del comprobante de pago',
    example: 'https://storage.example.com/comprobantes/pago_123.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  comprobante_url?: string;

  @ApiProperty({
    description: 'Notas adicionales sobre el pago',
    example: 'Pago procesado automáticamente',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
