import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsInt, IsOptional } from 'class-validator';

export class CreatePrecioDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  id_producto: number;

  @ApiProperty({ description: 'Nuevo precio del producto' })
  @IsNumber()
  precio: number;

  @ApiProperty({ description: 'Motivo del cambio de precio', required: false })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiProperty({ description: 'ID del usuario que realiza el cambio' })
  @IsInt()
  id_usuario: number;
}
