import { IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarPermisoDto {
  @ApiProperty({
    description: 'ID del permiso a asignar',
    example: 1,
  })
  @IsNumber()
  permiso_id: number;

  @ApiPropertyOptional({
    description: 'ID del rol al que asignar el permiso',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  rol_id?: number;

  @ApiPropertyOptional({
    description: 'ID del usuario al que asignar el permiso',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  usuario_id?: bigint;

  @ApiPropertyOptional({
    description: 'Condiciones para el permiso en formato JSON',
    example: { empresa_id: 1 },
  })
  @IsObject()
  @IsOptional()
  condiciones?: Record<string, any>;
}
