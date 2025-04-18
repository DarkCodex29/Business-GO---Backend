import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermisoDto {
  @ApiProperty({
    description: 'Nombre único del permiso',
    example: 'crear_usuario',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del permiso',
    example: 'Permite crear nuevos usuarios en el sistema',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Recurso al que se aplica el permiso',
    example: 'usuario',
  })
  @IsString()
  @IsNotEmpty()
  recurso: string;

  @ApiProperty({
    description: 'Acción permitida sobre el recurso',
    example: 'crear',
  })
  @IsString()
  @IsNotEmpty()
  accion: string;
}
