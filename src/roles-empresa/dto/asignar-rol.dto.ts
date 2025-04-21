import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AsignarRolDto {
  @ApiProperty({
    description: 'ID del usuario al que se asignará el rol',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  id_usuario: number;

  @ApiProperty({
    description: 'ID del rol que se asignará',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  id_rol: number;
}
