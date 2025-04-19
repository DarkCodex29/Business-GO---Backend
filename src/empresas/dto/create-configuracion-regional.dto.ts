import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConfiguracionRegionalDto {
  @ApiProperty({
    description: 'Zona horaria de la empresa',
    example: 'America/Lima',
  })
  @IsString()
  @IsNotEmpty()
  zona_horaria: string;

  @ApiProperty({
    description: 'Formato de fecha',
    example: 'DD/MM/YYYY',
  })
  @IsString()
  @IsNotEmpty()
  formato_fecha: string;

  @ApiProperty({
    description: 'Formato de hora',
    example: 'HH:mm:ss',
  })
  @IsString()
  @IsNotEmpty()
  formato_hora: string;

  @ApiProperty({
    description: 'Idioma principal',
    example: 'es',
  })
  @IsString()
  @IsNotEmpty()
  idioma: string;

  @ApiProperty({
    description: 'Formato de números',
    example: '#,##0.00',
  })
  @IsString()
  @IsNotEmpty()
  formato_numero: string;
}
