import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateClienteDireccionDto {
  @ApiProperty({
    description: 'Dirección completa',
    example: 'Av. Principal 123',
  })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({
    description: 'Departamento',
    example: 'Lima',
  })
  @IsString()
  @IsNotEmpty()
  departamento: string;

  @ApiProperty({
    description: 'Provincia',
    example: 'Lima',
  })
  @IsString()
  @IsNotEmpty()
  provincia: string;

  @ApiProperty({
    description: 'Distrito',
    example: 'Miraflores',
  })
  @IsString()
  @IsNotEmpty()
  distrito: string;

  @ApiProperty({
    description: 'ID de la empresa a la que pertenece la dirección',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;
}
