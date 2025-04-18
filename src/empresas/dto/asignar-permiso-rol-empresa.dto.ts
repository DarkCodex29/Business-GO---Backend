import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class AsignarPermisoRolEmpresaDto {
  @ApiProperty({
    description: 'ID del rol de empresa',
    example: 1,
  })
  @IsNumber()
  rol_id: number;

  @ApiProperty({
    description: 'ID del permiso a asignar',
    example: 1,
  })
  @IsNumber()
  permiso_id: number;

  @ApiProperty({
    description: 'Condiciones para el permiso en formato JSON',
    example: '{"horario": "9:00-18:00"}',
    required: false,
  })
  @IsString()
  @IsOptional()
  condiciones?: string;
}
