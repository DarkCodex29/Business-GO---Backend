import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRolDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Administrador',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Rol con acceso total al sistema',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio de vigencia del rol',
    example: '2024-01-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fecha_inicio?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de fin de vigencia del rol',
    example: '2024-12-31',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fecha_fin?: Date;

  @ApiPropertyOptional({
    description: 'Horario de inicio del rol',
    example: '09:00',
  })
  @IsString()
  @IsOptional()
  horario_inicio?: string;

  @ApiPropertyOptional({
    description: 'Horario de fin del rol',
    example: '18:00',
  })
  @IsString()
  @IsOptional()
  horario_fin?: string;

  @ApiPropertyOptional({
    description: 'ID del rol padre (para jerarquía de roles)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  rol_padre_id?: number;

  @ApiPropertyOptional({
    description: 'Indica si el rol es un rol del sistema',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  es_sistema?: boolean;
}
