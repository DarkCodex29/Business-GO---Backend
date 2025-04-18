import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePrecioDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsNumber()
  id_producto: number;

  @ApiProperty({ description: 'Precio anterior del producto' })
  @IsNumber()
  precio_anterior: number;

  @ApiProperty({ description: 'Nuevo precio del producto' })
  @IsNumber()
  precio_nuevo: number;

  @ApiProperty({ description: 'Motivo del cambio de precio', required: false })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiProperty({ description: 'ID del usuario que realiza el cambio' })
  @IsNumber()
  id_usuario: number;
}
