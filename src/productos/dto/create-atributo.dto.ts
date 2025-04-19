import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateAtributoDto {
  @ApiProperty({ description: 'ID del producto al que pertenece el atributo' })
  @IsInt()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({
    description: 'Nombre del atributo (ej: color, talla, material)',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Valor del atributo (ej: rojo, XL, algodón)' })
  @IsString()
  @IsNotEmpty()
  valor: string;
}
