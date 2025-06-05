import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export enum TipoEmail {
  BIENVENIDA = 'bienvenida',
  RECUPERACION_PASSWORD = 'recuperacion_password',
  CONFIRMACION_CITA = 'confirmacion_cita',
  CANCELACION_CITA = 'cancelacion_cita',
  RECORDATORIO_CITA = 'recordatorio_cita',
  FACTURA = 'factura',
  PROMOCION = 'promocion',
  NEWSLETTER = 'newsletter',
  NOTIFICACION = 'notificacion',
  PERSONALIZADO = 'personalizado',
}

export enum PrioridadEmail {
  BAJA = 'baja',
  NORMAL = 'normal',
  ALTA = 'alta',
  URGENTE = 'urgente',
}

export class SendEmailDto {
  @ApiProperty({
    description: 'Email del destinatario',
    example: 'cliente@ejemplo.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  to: string;

  @ApiProperty({
    description: 'Emails adicionales en copia (CC)',
    example: ['gerente@empresa.com'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'CC debe ser un array' })
  @IsEmail({}, { each: true, message: 'Cada CC debe ser un email válido' })
  cc?: string[];

  @ApiProperty({
    description: 'Emails adicionales en copia oculta (BCC)',
    example: ['admin@empresa.com'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'BCC debe ser un array' })
  @IsEmail({}, { each: true, message: 'Cada BCC debe ser un email válido' })
  bcc?: string[];

  @ApiProperty({
    description: 'Asunto del email',
    example: 'Confirmación de tu cita',
  })
  @IsString({ message: 'El asunto debe ser texto' })
  @IsNotEmpty({ message: 'El asunto es requerido' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  subject: string;

  @ApiProperty({
    description: 'Contenido HTML del email',
    example: '<h1>Hola</h1><p>Tu cita está confirmada</p>',
  })
  @IsString({ message: 'El contenido HTML debe ser texto' })
  @IsNotEmpty({ message: 'El contenido HTML es requerido' })
  htmlContent: string;

  @ApiProperty({
    description: 'Contenido de texto plano del email',
    example: 'Hola, tu cita está confirmada',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El contenido de texto debe ser texto' })
  textContent?: string;

  @ApiProperty({
    description: 'Tipo de email',
    enum: TipoEmail,
    example: TipoEmail.CONFIRMACION_CITA,
  })
  @IsEnum(TipoEmail, { message: 'Tipo de email no válido' })
  tipo: TipoEmail;

  @ApiProperty({
    description: 'Prioridad del email',
    enum: PrioridadEmail,
    example: PrioridadEmail.NORMAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(PrioridadEmail, { message: 'Prioridad no válida' })
  prioridad?: PrioridadEmail;

  @ApiProperty({
    description: 'Variables para reemplazar en la plantilla',
    example: { nombre: 'Juan', fecha: '2024-01-15' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las variables deben ser un objeto' })
  variables?: Record<string, any>;

  @ApiProperty({
    description: 'ID de la plantilla a usar',
    example: 1,
    required: false,
  })
  @IsOptional()
  plantilla_id?: number;

  @ApiProperty({
    description: 'Programar envío para fecha específica',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La fecha programada debe ser texto' })
  fecha_programada?: string;

  @ApiProperty({
    description: 'Adjuntos del email',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los adjuntos deben ser un array' })
  adjuntos?: {
    nombre: string;
    contenido: string; // Base64
    tipo_mime: string;
  }[];

  @ApiProperty({
    description: 'Habilitar seguimiento de apertura',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El seguimiento debe ser booleano' })
  seguimiento_apertura?: boolean;

  @ApiProperty({
    description: 'Habilitar seguimiento de clics',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El seguimiento de clics debe ser booleano' })
  seguimiento_clics?: boolean;

  @ApiProperty({
    description: 'Metadatos adicionales',
    example: { campana_id: 123, origen: 'web' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto' })
  metadata?: Record<string, any>;
}
