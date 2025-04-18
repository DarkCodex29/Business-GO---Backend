import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePermisoDto {
  @ApiProperty({ description: 'Nombre del permiso' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Descripción del permiso' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ description: 'Recurso al que se aplica el permiso' })
  @IsString()
  @IsNotEmpty()
  recurso: string;

  @ApiProperty({ description: 'Acción que se puede realizar sobre el recurso' })
  @IsString()
  @IsNotEmpty()
  accion: string;
}
