import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateRolEmpresaDto {
  @ApiProperty({
    description: 'Nombre del rol de empresa',
    example: 'Administrador de Ventas',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del rol',
    example: 'Rol para administrar ventas y facturación',
    required: false,
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
  })
  @IsInt()
  id_empresa: number;

  @ApiProperty({
    description: 'Horario de inicio',
    example: '09:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  horario_inicio?: string;

  @ApiProperty({
    description: 'Horario de fin',
    example: '18:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  horario_fin?: string;

  @ApiProperty({
    description: 'Fecha de inicio',
    example: '2024-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @ApiProperty({
    description: 'Fecha de fin',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;
}
