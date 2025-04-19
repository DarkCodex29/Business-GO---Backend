import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class PermisoDto {
  @ApiProperty({
    example: 1,
    description: 'ID del permiso a asignar',
  })
  @IsNumber()
  id_permiso: number;

  @ApiProperty({
    example: 'usuarios',
    description: 'Recurso al que se aplica el permiso',
  })
  @IsString()
  recurso: string;

  @ApiProperty({
    example: 'crear',
    description: 'Acción permitida sobre el recurso',
  })
  @IsString()
  accion: string;
}

export class CreateEmpresaRolDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Administrador',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del rol',
    example: 'Rol con acceso total al sistema',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiProperty({
    description: 'Horario de inicio',
    example: '09:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  horario_inicio?: string;

  @ApiProperty({
    description: 'Horario de fin',
    example: '18:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  horario_fin?: string;

  @ApiProperty({
    description: 'Fecha de inicio',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  fecha_inicio?: string;

  @ApiProperty({
    description: 'Fecha de fin',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  fecha_fin?: string;

  @ApiProperty({
    description: 'Lista de IDs de permisos',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permisos?: number[];
}
