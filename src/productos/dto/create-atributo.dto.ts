import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt } from 'class-validator';

export class CreateAtributoDto {
  @ApiProperty({
    description: 'Nombre del atributo',
    example: 'Color',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Valor del atributo',
    example: 'Rojo',
  })
  @IsString()
  valor: string;

  @ApiProperty({
    description: 'ID del producto al que pertenece el atributo',
    example: 1,
  })
  @IsInt()
  id_producto: number;
}
