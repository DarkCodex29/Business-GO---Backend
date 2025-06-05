import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import {
  PlanSuscripcion,
  EstadoSuscripcion,
} from '../../common/enums/estados.enum';

export class CreateSuscripcionDto {
  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({
    description: 'Plan de suscripción',
    enum: PlanSuscripcion,
    example: PlanSuscripcion.TRIAL,
  })
  @IsEnum(PlanSuscripcion)
  @IsNotEmpty()
  plan: PlanSuscripcion;

  @ApiProperty({
    description: 'Estado de la suscripción',
    enum: EstadoSuscripcion,
    example: EstadoSuscripcion.TRIAL,
    required: false,
  })
  @IsEnum(EstadoSuscripcion)
  @IsOptional()
  estado?: EstadoSuscripcion;

  @ApiProperty({
    description: 'Fecha de fin de la suscripción',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @ApiProperty({
    description: 'Límite de clientes',
    example: 200,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limite_clientes?: number;

  @ApiProperty({
    description: 'Límite de productos',
    example: 100,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limite_productos?: number;

  @ApiProperty({
    description: 'Límite de usuarios',
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limite_usuarios?: number;

  @ApiProperty({
    description: 'Límite de mensajes WhatsApp por mes',
    example: 2000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limite_mensajes?: number;

  @ApiProperty({
    description: 'Precio mensual en soles peruanos',
    example: 99.0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  precio_mensual?: number;

  @ApiProperty({
    description: 'Fecha del próximo pago',
    example: '2024-02-01T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_proximo_pago?: string;

  @ApiProperty({
    description: 'Si la suscripción está activa',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
