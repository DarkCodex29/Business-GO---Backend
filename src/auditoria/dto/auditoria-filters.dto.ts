import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIP,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  TipoAccion,
  TipoRecurso,
  NivelSeveridad,
} from './create-auditoria.dto';

export class AuditoriaFiltersDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de acción específica',
    enum: TipoAccion,
    example: TipoAccion.CREAR,
  })
  @IsOptional()
  @IsEnum(TipoAccion, { message: 'Tipo de acción no válido' })
  accion?: TipoAccion;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de recurso específico',
    enum: TipoRecurso,
    example: TipoRecurso.USUARIO,
  })
  @IsOptional()
  @IsEnum(TipoRecurso, { message: 'Tipo de recurso no válido' })
  recurso?: TipoRecurso;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de recurso específico',
    example: 'uuid-del-recurso',
  })
  @IsOptional()
  @IsString({ message: 'El ID del recurso debe ser texto' })
  recurso_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de usuario específico',
    example: 'uuid-del-usuario',
  })
  @IsOptional()
  @IsString({ message: 'El ID del usuario debe ser texto' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por nivel de severidad',
    enum: NivelSeveridad,
    example: NivelSeveridad.ERROR,
  })
  @IsOptional()
  @IsEnum(NivelSeveridad, { message: 'Nivel de severidad no válido' })
  severidad?: NivelSeveridad;

  @ApiPropertyOptional({
    description: 'Fecha de inicio para el filtro (formato: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de inicio debe ser válida (YYYY-MM-DD)' })
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin para el filtro (formato: YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de fin debe ser válida (YYYY-MM-DD)' })
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Texto a buscar en descripción o ID de recurso',
    example: 'usuario creado',
  })
  @IsOptional()
  @IsString({ message: 'El texto de búsqueda debe ser texto' })
  @MaxLength(100, {
    message: 'El texto de búsqueda no puede exceder 100 caracteres',
  })
  buscar?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por dirección IP específica',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP(undefined, { message: 'Debe ser una dirección IP válida' })
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por múltiples tipos de acciones',
    type: [String],
    enum: TipoAccion,
    example: [TipoAccion.CREAR, TipoAccion.ACTUALIZAR],
  })
  @IsOptional()
  @IsArray({ message: 'Las acciones deben ser un array' })
  @IsEnum(TipoAccion, { each: true, message: 'Cada acción debe ser válida' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  acciones?: TipoAccion[];

  @ApiPropertyOptional({
    description: 'Filtrar por múltiples tipos de recursos',
    type: [String],
    enum: TipoRecurso,
    example: [TipoRecurso.USUARIO, TipoRecurso.EMPRESA],
  })
  @IsOptional()
  @IsArray({ message: 'Los recursos deben ser un array' })
  @IsEnum(TipoRecurso, { each: true, message: 'Cada recurso debe ser válido' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  recursos?: TipoRecurso[];

  @ApiPropertyOptional({
    description: 'Mostrar solo eventos críticos (severidad critical o error)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Solo críticos debe ser un valor booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  solo_criticos?: boolean;

  @ApiPropertyOptional({
    description: 'Excluir eventos de lectura (acción "leer")',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Excluir lectura debe ser un valor booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  excluir_lectura?: boolean;
}
