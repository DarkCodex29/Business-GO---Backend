import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNotificacionDto {
  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Nueva oferta especial',
  })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({
    description: 'Contenido de la notificación',
    example: '¡Aprovecha nuestra oferta del 20% de descuento!',
  })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiProperty({
    description: 'Tipo de notificación',
    example: 'OFERTA',
    required: false,
  })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiProperty({
    description: 'Enlace opcional asociado a la notificación',
    example: 'https://ejemplo.com/oferta',
    required: false,
  })
  @IsString()
  @IsOptional()
  enlace?: string;
}
