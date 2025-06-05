import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsUUID,
  MaxLength,
  IsIP,
} from 'class-validator';

export enum TipoAccion {
  CREAR = 'crear',
  LEER = 'leer',
  ACTUALIZAR = 'actualizar',
  ELIMINAR = 'eliminar',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESO_DENEGADO = 'acceso_denegado',
  EXPORTAR = 'exportar',
  IMPORTAR = 'importar',
  CONFIGURAR = 'configurar',
}

export enum TipoRecurso {
  USUARIO = 'usuario',
  EMPRESA = 'empresa',
  CLIENTE = 'cliente',
  PRODUCTO = 'producto',
  VENTA = 'venta',
  COMPRA = 'compra',
  INVENTARIO = 'inventario',
  REPORTE = 'reporte',
  CONFIGURACION = 'configuracion',
  SISTEMA = 'sistema',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  NOTIFICACION = 'notificacion',
  ARCHIVO = 'archivo',
  AUDITORIA = 'auditoria',
}

export enum NivelSeveridad {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export class CreateAuditoriaDto {
  @ApiProperty({
    description: 'Tipo de acción realizada',
    enum: TipoAccion,
    example: TipoAccion.CREAR,
  })
  @IsEnum(TipoAccion, { message: 'Tipo de acción no válido' })
  @IsNotEmpty({ message: 'El tipo de acción es requerido' })
  accion: TipoAccion;

  @ApiProperty({
    description: 'Tipo de recurso afectado',
    enum: TipoRecurso,
    example: TipoRecurso.USUARIO,
  })
  @IsEnum(TipoRecurso, { message: 'Tipo de recurso no válido' })
  @IsNotEmpty({ message: 'El tipo de recurso es requerido' })
  recurso: TipoRecurso;

  @ApiProperty({
    description: 'ID del recurso afectado',
    example: 'uuid-del-recurso',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El ID del recurso debe ser texto' })
  recurso_id?: string;

  @ApiProperty({
    description: 'Descripción detallada de la acción',
    example: 'Usuario creado exitosamente',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  descripcion: string;

  @ApiProperty({
    description: 'Nivel de severidad del evento',
    enum: NivelSeveridad,
    example: NivelSeveridad.INFO,
    required: false,
  })
  @IsOptional()
  @IsEnum(NivelSeveridad, { message: 'Nivel de severidad no válido' })
  severidad?: NivelSeveridad;

  @ApiProperty({
    description: 'Datos antes del cambio (para actualizaciones)',
    example: { nombre: 'Juan', email: 'juan@ejemplo.com' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los datos anteriores deben ser un objeto' })
  datos_anteriores?: Record<string, any>;

  @ApiProperty({
    description: 'Datos después del cambio',
    example: { nombre: 'Juan Carlos', email: 'juan.carlos@ejemplo.com' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los datos nuevos deben ser un objeto' })
  datos_nuevos?: Record<string, any>;

  @ApiProperty({
    description: 'Dirección IP del usuario',
    example: '192.168.1.100',
    required: false,
  })
  @IsOptional()
  @IsIP(undefined, { message: 'Debe ser una dirección IP válida' })
  ip_address?: string;

  @ApiProperty({
    description: 'User Agent del navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El User Agent debe ser texto' })
  @MaxLength(500, { message: 'El User Agent no puede exceder 500 caracteres' })
  user_agent?: string;

  @ApiProperty({
    description: 'Metadatos adicionales del evento',
    example: { modulo: 'usuarios', version: '1.0.0' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto' })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'ID de la empresa (se asigna automáticamente)',
    required: false,
  })
  @IsOptional()
  @IsUUID(4, { message: 'El ID de empresa debe ser un UUID válido' })
  empresa_id?: string;

  @ApiProperty({
    description: 'ID del usuario (se asigna automáticamente)',
    required: false,
  })
  @IsOptional()
  @IsUUID(4, { message: 'El ID de usuario debe ser un UUID válido' })
  usuario_id?: string;
}
