import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdatePermisoDto {
  @ApiProperty({
    description: 'Nombre del permiso',
    example: 'crear_usuario',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    description: 'Descripción del permiso',
    example: 'Permite crear nuevos usuarios en el sistema',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Recurso al que se aplica el permiso',
    example: 'usuarios',
  })
  @IsString()
  @IsOptional()
  recurso?: string;

  @ApiProperty({
    description: 'Acción que se puede realizar sobre el recurso',
    example: 'crear',
  })
  @IsString()
  @IsOptional()
  accion?: string;
}
