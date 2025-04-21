import { IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AsignarPermisosDto {
  @ApiProperty({
    description: 'Lista de IDs de permisos a asignar',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  permisoIds: number[];
}
