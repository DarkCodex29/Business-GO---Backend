import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsNotEmpty,
  IsDateString,
  Matches,
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
    description: 'Nombre del rol en la empresa',
    example: 'Gerente de Ventas',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del rol',
    example: 'Responsable de supervisar el equipo de ventas y establecer metas',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'ID de la empresa a la que pertenece el rol',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @ApiPropertyOptional({
    description: 'Hora de inicio del horario laboral (formato HH:mm)',
    example: '09:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?\d|2[0-3]):\d\d$/, {
    message: 'El formato de hora debe ser HH:mm',
  })
  horario_inicio?: string;

  @ApiPropertyOptional({
    description: 'Hora de fin del horario laboral (formato HH:mm)',
    example: '18:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?\d|2[0-3]):\d\d$/, {
    message: 'El formato de hora debe ser HH:mm',
  })
  horario_fin?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio de vigencia del rol',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de fin de vigencia del rol',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;

  @ApiPropertyOptional({
    description: 'IDs de los permisos asignados al rol',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permisos?: number[];
}
