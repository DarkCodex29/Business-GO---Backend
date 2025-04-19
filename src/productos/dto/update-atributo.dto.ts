import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateAtributoDto {
  @ApiProperty({
    description: 'Nombre del atributo (ej: color, talla, material)',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    description: 'Valor del atributo (ej: rojo, XL, algodón)',
    required: false,
  })
  @IsString()
  @IsOptional()
  valor?: string;
}
