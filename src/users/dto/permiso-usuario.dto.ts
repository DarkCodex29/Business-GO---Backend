import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PermisoUsuarioDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  usuario_id: number;

  @ApiProperty({
    description: 'ID del permiso',
    example: 1,
  })
  @IsNumber()
  permiso_id: number;

  @ApiProperty({
    description: 'Condiciones adicionales del permiso',
    example: 'solo_durante_horario_laboral',
    required: false,
  })
  @IsOptional()
  @IsString()
  condiciones?: string;
}
