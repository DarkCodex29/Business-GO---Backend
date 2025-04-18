import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDate, IsOptional } from 'class-validator';

export class UsuarioRolEmpresaDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  id_usuario: number;

  @ApiProperty({
    description: 'ID del rol de empresa',
    example: 1,
  })
  @IsNumber()
  id_rol: number;

  @ApiProperty({
    description: 'Fecha de inicio del rol',
    example: '2024-03-20T10:00:00Z',
  })
  @IsDate()
  fecha_inicio: Date;

  @ApiProperty({
    description: 'Fecha de fin del rol',
    example: '2024-03-20T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  fecha_fin?: Date;
}
