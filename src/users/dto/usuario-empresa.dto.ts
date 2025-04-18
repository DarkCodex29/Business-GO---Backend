import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDate,
  IsDecimal,
} from 'class-validator';

export class UsuarioEmpresaDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  usuario_id: number;

  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
  })
  @IsNumber()
  empresa_id: number;

  @ApiProperty({
    description: 'Cargo del usuario en la empresa',
    example: 'Gerente',
    required: false,
  })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiProperty({
    description: 'Departamento del usuario',
    example: 'Ventas',
    required: false,
  })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiProperty({
    description: 'Indica si el usuario es dueño de la empresa',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_dueno?: boolean;

  @ApiProperty({
    description: 'Fecha de inicio en la empresa',
    example: '2024-03-20T10:00:00Z',
  })
  @IsDate()
  fecha_inicio: Date;

  @ApiProperty({
    description: 'Fecha de fin en la empresa',
    example: '2024-03-20T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  fecha_fin?: Date;

  @ApiProperty({
    description: 'Estado del usuario en la empresa',
    example: 'activo',
    default: 'activo',
  })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiProperty({
    description: 'Tipo de contrato',
    example: 'indefinido',
    default: 'indefinido',
  })
  @IsOptional()
  @IsString()
  tipo_contrato?: string;

  @ApiProperty({
    description: 'Salario del usuario',
    example: 5000.0,
    required: false,
  })
  @IsOptional()
  @IsDecimal()
  salario?: number;

  @ApiProperty({
    description: 'Horario de trabajo',
    example: { inicio: '09:00', fin: '18:00' },
    required: false,
  })
  @IsOptional()
  horario_trabajo?: any;

  @ApiProperty({
    description: 'Beneficios del usuario',
    example: { seguro_medico: true, vacaciones: 30 },
    required: false,
  })
  @IsOptional()
  beneficios?: any;

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Usuario con experiencia en ventas',
    required: false,
  })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({
    description: 'ID del rol de empresa asignado',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  rol_empresa_id?: number;
}
