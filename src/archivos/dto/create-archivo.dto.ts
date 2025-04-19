import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsJSON,
} from 'class-validator';

export class CreateArchivoDto {
  @ApiProperty({ description: 'Nombre del archivo' })
  @IsString()
  nombre_archivo: string;

  @ApiProperty({ description: 'Tipo de archivo' })
  @IsString()
  tipo_archivo: string;

  @ApiProperty({ description: 'Tipo MIME del archivo' })
  @IsString()
  mime_type: string;

  @ApiProperty({ description: 'URL del archivo' })
  @IsString()
  url_archivo: string;

  @ApiProperty({ description: 'Tamaño del archivo en bytes' })
  @IsNumber()
  tamanio_bytes: number;

  @ApiProperty({
    description: 'Dimensiones del archivo (para imágenes/videos)',
    required: false,
  })
  @IsOptional()
  @IsJSON()
  dimensiones?: any;

  @ApiProperty({
    description: 'Metadatos adicionales del archivo',
    required: false,
  })
  @IsOptional()
  @IsJSON()
  metadata?: any;

  @ApiProperty({
    description: 'ID de la categoría del archivo',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  categoria_id?: number;

  @ApiProperty({ description: 'ID de la empresa', required: false })
  @IsOptional()
  @IsNumber()
  empresa_id?: number;

  @ApiProperty({ description: 'ID del producto asociado', required: false })
  @IsOptional()
  @IsNumber()
  producto_id?: number;

  @ApiProperty({ description: 'ID del documento asociado', required: false })
  @IsOptional()
  @IsNumber()
  documento_id?: number;

  @ApiProperty({ description: 'Estado del archivo', default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
