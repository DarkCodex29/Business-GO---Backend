import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

export class AsignarPermisoRolEmpresaDto {
  @ApiProperty({
    description: 'ID del rol de empresa',
    example: 1,
  })
  @IsNumber()
  rol_id: number;

  @ApiProperty({
    description: 'IDs de los permisos a asignar',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  permisos: number[];

  @ApiProperty({
    description: 'Condiciones para los permisos en formato JSON',
    example: '{"horario": "9:00-18:00"}',
    required: false,
  })
  @IsString()
  @IsOptional()
  condiciones?: string;
}
