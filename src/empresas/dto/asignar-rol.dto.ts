import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString } from 'class-validator';

export class AsignarRolDto {
  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
  })
  @IsNumber()
  id_empresa: number;

  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  id_usuario: number;

  @ApiProperty({
    description: 'ID del rol',
    example: 1,
  })
  @IsNumber()
  id_rol: number;

  @ApiProperty({
    description: 'Fecha de inicio de la asignación',
    example: '2024-03-20T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: Date;

  @ApiProperty({
    description: 'Fecha de fin de la asignación',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fecha_fin?: Date;
}
