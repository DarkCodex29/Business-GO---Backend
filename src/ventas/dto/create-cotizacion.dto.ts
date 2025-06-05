import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDateString,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  IsOptional,
  Length,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoCotizacion {
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  VENCIDA = 'vencida',
  CONVERTIDA = 'convertida',
}

export class ItemCotizacionDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto o servicio',
    minimum: 1,
  })
  @IsNumber({}, { message: 'El ID del producto debe ser un número' })
  @Min(1, { message: 'El ID del producto debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El ID del producto es obligatorio' })
  id_producto: number;

  @ApiProperty({
    example: 2,
    description: 'Cantidad del producto (unidades)',
    minimum: 1,
    maximum: 999999,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(999999, { message: 'La cantidad no puede exceder 999,999 unidades' })
  @IsNotEmpty({ message: 'La cantidad es obligatoria' })
  cantidad: number;

  @ApiProperty({
    example: 100.5,
    description: 'Precio unitario del producto en soles peruanos',
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @Min(0.01, { message: 'El precio unitario debe ser mayor a S/ 0.01' })
  @Max(1000000, { message: 'El precio unitario no puede exceder S/ 1,000,000' })
  @IsNotEmpty({ message: 'El precio unitario es obligatorio' })
  precio_unitario: number;

  @ApiProperty({
    example: 5.0,
    description: 'Descuento aplicado al item (porcentaje o monto fijo)',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(100, { message: 'El descuento porcentual no puede exceder 100%' })
  descuento?: number = 0;
}

export class CreateCotizacionDto {
  @ApiProperty({
    example: 1,
    description: 'ID del cliente',
    minimum: 1,
  })
  @IsNumber({}, { message: 'El ID del cliente debe ser un número' })
  @Min(1, { message: 'El ID del cliente debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El ID del cliente es obligatorio' })
  id_cliente: number;

  @ApiProperty({
    example: '2024-03-15T00:00:00.000Z',
    description: 'Fecha de emisión de la cotización (ISO 8601)',
  })
  @IsDateString(
    {},
    { message: 'La fecha de emisión debe ser una fecha válida' },
  )
  @IsNotEmpty({ message: 'La fecha de emisión es obligatoria' })
  fecha_emision: string;

  @ApiProperty({
    example: '2024-04-15T00:00:00.000Z',
    description: 'Fecha de validez de la cotización (ISO 8601)',
  })
  @IsDateString(
    {},
    { message: 'La fecha de validez debe ser una fecha válida' },
  )
  @IsNotEmpty({ message: 'La fecha de validez es obligatoria' })
  fecha_validez: string;

  @ApiProperty({
    enum: EstadoCotizacion,
    example: EstadoCotizacion.PENDIENTE,
    description: 'Estado inicial de la cotización',
  })
  @IsEnum(EstadoCotizacion, {
    message:
      'El estado debe ser: PENDIENTE, ENVIADA, ACEPTADA, RECHAZADA o VENCIDA',
  })
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  estado: EstadoCotizacion;

  @ApiProperty({
    example: 'Cotización para proyecto de desarrollo web empresarial',
    description: 'Notas adicionales o comentarios sobre la cotización',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  @Length(0, 500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notas?: string;

  @ApiProperty({
    type: [ItemCotizacionDto],
    description: 'Lista de productos/servicios incluidos en la cotización',
    minItems: 1,
    maxItems: 100,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un item' })
  @ArrayMaxSize(100, { message: 'No se pueden incluir más de 100 items' })
  @ValidateNested({ each: true })
  @Type(() => ItemCotizacionDto)
  items: ItemCotizacionDto[];
}
