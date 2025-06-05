import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { TipoEmail } from './send-email.dto';

export enum CategoriaPlantilla {
  TRANSACCIONAL = 'transaccional',
  MARKETING = 'marketing',
  NOTIFICACION = 'notificacion',
  SISTEMA = 'sistema',
}

export class CreatePlantillaDto {
  @ApiProperty({
    description: 'Nombre de la plantilla',
    example: 'Confirmación de Cita',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Descripción de la plantilla',
    example: 'Plantilla para confirmar citas de clientes',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  descripcion?: string;

  @ApiProperty({
    description: 'Asunto del email (puede contener variables)',
    example: 'Confirmación de cita - {{nombre_cliente}}',
  })
  @IsString({ message: 'El asunto debe ser texto' })
  @IsNotEmpty({ message: 'El asunto es requerido' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  asunto: string;

  @ApiProperty({
    description: 'Contenido HTML de la plantilla',
    example:
      '<h1>Hola {{nombre_cliente}}</h1><p>Tu cita está confirmada para el {{fecha_cita}}</p>',
  })
  @IsString({ message: 'El contenido HTML debe ser texto' })
  @IsNotEmpty({ message: 'El contenido HTML es requerido' })
  contenido_html: string;

  @ApiProperty({
    description: 'Contenido de texto plano de la plantilla',
    example:
      'Hola {{nombre_cliente}}, tu cita está confirmada para el {{fecha_cita}}',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El contenido de texto debe ser texto' })
  contenido_texto?: string;

  @ApiProperty({
    description: 'Tipo de email asociado',
    enum: TipoEmail,
    example: TipoEmail.CONFIRMACION_CITA,
  })
  @IsEnum(TipoEmail, { message: 'Tipo de email no válido' })
  tipo_email: TipoEmail;

  @ApiProperty({
    description: 'Categoría de la plantilla',
    enum: CategoriaPlantilla,
    example: CategoriaPlantilla.TRANSACCIONAL,
  })
  @IsEnum(CategoriaPlantilla, { message: 'Categoría no válida' })
  categoria: CategoriaPlantilla;

  @ApiProperty({
    description: 'Variables disponibles en la plantilla',
    example: ['nombre_cliente', 'fecha_cita', 'servicio'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Las variables deben ser un array' })
  @IsString({ each: true, message: 'Cada variable debe ser texto' })
  variables_disponibles?: string[];

  @ApiProperty({
    description: 'CSS personalizado para la plantilla',
    example: '.header { background-color: #007bff; }',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El CSS debe ser texto' })
  css_personalizado?: string;

  @ApiProperty({
    description: 'Si la plantilla está activa',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  activa?: boolean;

  @ApiProperty({
    description: 'Configuración adicional de la plantilla',
    example: {
      incluir_footer: true,
      incluir_header: true,
      color_primario: '#007bff',
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'La configuración debe ser un objeto' })
  configuracion?: Record<string, any>;

  @ApiProperty({
    description: 'Tags para organizar plantillas',
    example: ['citas', 'confirmacion', 'clientes'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los tags deben ser un array' })
  @IsString({ each: true, message: 'Cada tag debe ser texto' })
  tags?: string[];
}
