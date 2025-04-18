import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AsignarRolDto {
  @ApiProperty({
    description: 'ID del usuario al que se asignará el rol',
    example: '123',
  })
  @IsString()
  id_usuario: string;

  @ApiProperty({ description: 'ID del rol a asignar', example: '456' })
  @IsString()
  id_rol: string;

  @ApiProperty({
    description: 'Fecha de inicio de la asignación',
    example: '2024-03-20',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: Date;

  @ApiProperty({
    description: 'Fecha de fin de la asignación',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fecha_fin?: Date;
}
