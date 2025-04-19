import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateNotificacionBulkDto {
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

  @ApiProperty({
    description:
      'IDs de clientes específicos (opcional). Si no se proporciona, se enviará a todos los clientes',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  clienteIds?: number[];
}
