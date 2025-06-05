import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsJSON, IsEnum } from 'class-validator';

export enum TipoEntidad {
  USUARIO = 'usuario',
  EMPRESA = 'empresa',
  PRODUCTO = 'producto',
  DOCUMENTO = 'documento',
  CATEGORIA = 'categoria',
}

export class UploadArchivoDto {
  @ApiProperty({
    description: 'Archivo a subir',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Tipo de entidad a la que se asocia el archivo',
    enum: TipoEntidad,
    example: TipoEntidad.PRODUCTO,
  })
  @IsEnum(TipoEntidad, { message: 'Tipo de entidad no válido' })
  entityType: TipoEntidad;

  @ApiProperty({
    description: 'ID de la entidad a la que se asocia el archivo',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID de entidad debe ser un número' })
  entityId: number;

  @ApiProperty({
    description: 'Descripción del archivo',
    required: false,
    example: 'Imagen principal del producto',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  descripcion?: string;

  @ApiProperty({
    description: 'ID de la categoría del archivo',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID de categoría debe ser un número' })
  categoria_id?: number;

  @ApiProperty({
    description: 'Metadatos adicionales del archivo',
    required: false,
    example: { alt: 'Imagen del producto', tags: ['principal', 'destacado'] },
  })
  @IsOptional()
  @IsJSON({ message: 'Los metadatos deben ser un JSON válido' })
  metadata?: any;
} 