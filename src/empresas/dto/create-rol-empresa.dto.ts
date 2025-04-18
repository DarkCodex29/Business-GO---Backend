import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateRolEmpresaDto {
  @ApiProperty({
    example: 'Administrador',
    description: 'Nombre del rol',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    example: 'Rol con acceso total al sistema',
    description: 'Descripción del rol',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    example: 1,
    description: 'ID de la empresa a la que pertenece el rol',
  })
  @IsNumber()
  id_empresa: number;

  @ApiProperty({
    example: '09:00',
    description: 'Hora de inicio del horario permitido',
  })
  @IsOptional()
  @IsString()
  horario_inicio?: string;

  @ApiProperty({
    example: '18:00',
    description: 'Hora de fin del horario permitido',
  })
  @IsOptional()
  @IsString()
  horario_fin?: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Fecha de inicio de validez del rol',
  })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: Date;

  @ApiProperty({
    example: '2024-12-31',
    description: 'Fecha de fin de validez del rol',
  })
  @IsOptional()
  @IsDateString()
  fecha_fin?: Date;

  @ApiProperty({
    type: [PermisoDto],
    description: 'Lista de permisos asignados al rol',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermisoDto)
  permisos?: PermisoDto[];
}
