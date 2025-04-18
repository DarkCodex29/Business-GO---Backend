import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class AsignarPermisoDto {
  @ApiProperty({ description: 'ID del rol o usuario' })
  @IsNumber()
  rol_id?: number;

  @ApiProperty({ description: 'ID del usuario' })
  @IsNumber()
  usuario_id?: number;

  @ApiProperty({ description: 'ID del permiso' })
  @IsNumber()
  permiso_id: number;

  @ApiProperty({ description: 'Condiciones del permiso', required: false })
  @IsString()
  @IsOptional()
  condiciones?: string;
}
