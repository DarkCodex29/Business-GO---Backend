import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsPositive,
  IsNotEmpty,
  Length,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ItemOrdenCompraDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto a comprar',
    minimum: 1,
  })
  @IsNumber({}, { message: 'El ID del producto debe ser un número' })
  @IsPositive({ message: 'El ID del producto debe ser positivo' })
  id_producto: number;

  @ApiProperty({
    example: 10,
    description: 'Cantidad a comprar del producto',
    minimum: 0.01,
    maximum: 999999,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  @Max(999999, { message: 'La cantidad no puede exceder 999,999 unidades' })
  @Transform(({ value }) => parseFloat(value))
  cantidad: number;

  @ApiProperty({
    example: 25.5,
    description: 'Precio unitario de compra en soles',
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @Min(0.01, { message: 'El precio unitario debe ser mayor a S/ 0.01' })
  @Max(999999.99, {
    message: 'El precio unitario no puede exceder S/ 999,999.99',
  })
  @Transform(({ value }) => parseFloat(value))
  precio_unitario: number;
}

export class CreateOrdenCompraDto {
  @ApiProperty({
    example: 1,
    description: 'ID del proveedor que suministrará los productos',
    minimum: 1,
  })
  @IsNumber({}, { message: 'El ID del proveedor debe ser un número' })
  @IsPositive({ message: 'El ID del proveedor debe ser positivo' })
  id_proveedor: number;

  @ApiProperty({
    example: 'OC-2024-0001',
    description: 'Número único de la orden de compra',
    pattern: '^OC-\\d{4}-\\d{3,6}$',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: 'El número de orden debe ser texto' })
  @IsNotEmpty({ message: 'El número de orden es obligatorio' })
  @Length(3, 20, {
    message: 'El número de orden debe tener entre 3 y 20 caracteres',
  })
  @Matches(/^OC-\d{4}-\d{3,6}$/, {
    message:
      'El número de orden debe seguir el formato: OC-YYYY-NNNN (ej: OC-2024-001)',
  })
  numero_orden: string;

  @ApiProperty({
    example: '2024-12-31',
    description: 'Fecha esperada de entrega (formato YYYY-MM-DD)',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'La fecha de entrega debe tener formato válido (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'La fecha de entrega es obligatoria' })
  fecha_entrega: string;

  @ApiProperty({
    example: 'Entrega en horario de oficina, contactar con recepción',
    description: 'Notas adicionales para la orden de compra',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  @Length(0, 500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notas?: string;

  @ApiProperty({
    description: 'Lista de productos a comprar con sus cantidades y precios',
    type: [ItemOrdenCompraDto],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray({ message: 'Los items deben ser una lista' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un producto en la orden' })
  @ArrayMaxSize(50, {
    message: 'No puede incluir más de 50 productos por orden',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenCompraDto)
  items: ItemOrdenCompraDto[];
}
