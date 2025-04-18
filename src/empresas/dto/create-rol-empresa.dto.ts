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
    description: 'ID del permiso',
    example: 1,
  })
  @IsNumber()
  id_permiso: number;

  @ApiProperty({
    description: 'Recurso al que se aplica el permiso',
    example: 'usuarios',
  })
  @IsString()
  recurso: string;

  @ApiProperty({
    description: 'Acción permitida sobre el recurso',
    example: 'crear',
  })
  @IsString()
  accion: string;
}

export class CreateRolEmpresaDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Administrador',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del rol',
    example: 'Rol con acceso total al sistema',
    required: false,
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Lista de permisos asignados al rol',
    type: [PermisoDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermisoDto)
  @IsOptional()
  permisos?: PermisoDto[];

  @ApiProperty({
    description: 'Hora de inicio del rol (formato HH:mm)',
    example: '09:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  horario_inicio?: string;

  @ApiProperty({
    description: 'Hora de fin del rol (formato HH:mm)',
    example: '18:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  horario_fin?: string;

  @ApiProperty({
    description: 'Fecha de inicio de vigencia del rol',
    example: '2024-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @ApiProperty({
    description: 'Fecha de fin de vigencia del rol',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;
}
