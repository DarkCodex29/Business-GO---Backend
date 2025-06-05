import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  ArrayMaxSize,
  Length,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TipoReporte, FormatoReporte } from './create-reporte.dto';

// DTOs específicos para parámetros de cada tipo de reporte

export class ReporteVentasParamsDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del reporte (formato: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString(
    {},
    { message: 'Fecha de inicio debe tener formato válido YYYY-MM-DD' },
  )
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del reporte (formato: YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsDateString(
    {},
    { message: 'Fecha de fin debe tener formato válido YYYY-MM-DD' },
  )
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Agrupar resultados por período o entidad',
    enum: ['dia', 'semana', 'mes', 'producto', 'cliente'],
    example: 'mes',
  })
  @IsEnum(['dia', 'semana', 'mes', 'producto', 'cliente'], {
    message: 'Agrupación debe ser: dia, semana, mes, producto o cliente',
  })
  @IsOptional()
  agrupar_por?: 'dia' | 'semana' | 'mes' | 'producto' | 'cliente';

  @ApiPropertyOptional({
    description: 'Incluir detalles de items en el reporte',
    example: true,
  })
  @IsBoolean({ message: 'incluir_detalles debe ser verdadero o falso' })
  @IsOptional()
  incluir_detalles?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de la orden',
    enum: ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'],
    example: 'entregado',
  })
  @IsEnum(['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'], {
    message: 'Estado debe ser válido',
  })
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({
    description: 'Monto mínimo de venta a incluir (en soles)',
    example: 100.0,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Monto mínimo debe ser un número' })
  @Min(0, { message: 'Monto mínimo no puede ser negativo' })
  @IsOptional()
  monto_minimo?: number;

  @ApiPropertyOptional({
    description: 'Monto máximo de venta a incluir (en soles)',
    example: 10000.0,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Monto máximo debe ser un número' })
  @Min(0, { message: 'Monto máximo no puede ser negativo' })
  @IsOptional()
  monto_maximo?: number;
}

export class ReporteComprasParamsDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del reporte',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Fecha de inicio debe tener formato válido' })
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del reporte',
    example: '2024-12-31',
  })
  @IsDateString({}, { message: 'Fecha de fin debe tener formato válido' })
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Agrupar resultados por período o entidad',
    enum: ['dia', 'semana', 'mes', 'producto', 'proveedor'],
    example: 'mes',
  })
  @IsEnum(['dia', 'semana', 'mes', 'producto', 'proveedor'], {
    message: 'Agrupación debe ser: dia, semana, mes, producto o proveedor',
  })
  @IsOptional()
  agrupar_por?: 'dia' | 'semana' | 'mes' | 'producto' | 'proveedor';

  @ApiPropertyOptional({
    description: 'Incluir detalles de items en el reporte',
    example: true,
  })
  @IsBoolean({ message: 'incluir_detalles debe ser verdadero o falso' })
  @IsOptional()
  incluir_detalles?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por RUC del proveedor (11 dígitos)',
    example: '20123456789',
  })
  @Matches(/^\d{11}$/, { message: 'RUC debe tener exactamente 11 dígitos' })
  @IsOptional()
  ruc_proveedor?: string;
}

export class ReporteInventarioParamsDto {
  @ApiPropertyOptional({
    description: 'Incluir productos con stock bajo',
    example: true,
  })
  @IsBoolean({ message: 'incluir_bajos debe ser verdadero o falso' })
  @IsOptional()
  incluir_bajos?: boolean;

  @ApiPropertyOptional({
    description:
      'Umbral mínimo de stock para considerar producto con stock bajo',
    example: 10,
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Umbral mínimo debe ser un número' })
  @Min(0, { message: 'Umbral mínimo no puede ser negativo' })
  @Max(10000, { message: 'Umbral mínimo no puede exceder 10,000 unidades' })
  @IsOptional()
  umbral_minimo?: number;

  @ApiPropertyOptional({
    description: 'Agrupar productos por categoría',
    enum: ['categoria', 'subcategoria', 'proveedor'],
    example: 'categoria',
  })
  @IsEnum(['categoria', 'subcategoria', 'proveedor'], {
    message: 'Agrupación debe ser: categoria, subcategoria o proveedor',
  })
  @IsOptional()
  agrupar_por?: 'categoria' | 'subcategoria' | 'proveedor';

  @ApiPropertyOptional({
    description: 'Incluir historial de movimientos de stock',
    example: false,
  })
  @IsBoolean({ message: 'incluir_movimientos debe ser verdadero o falso' })
  @IsOptional()
  incluir_movimientos?: boolean;

  @ApiPropertyOptional({
    description: 'Valor mínimo de inventario a incluir (en soles)',
    example: 50.0,
  })
  @IsNumber({}, { message: 'Valor mínimo debe ser un número' })
  @Min(0, { message: 'Valor mínimo no puede ser negativo' })
  @IsOptional()
  valor_minimo?: number;
}

export class ReporteClientesParamsDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio para filtrar actividad de clientes',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Fecha de inicio debe tener formato válido' })
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin para filtrar actividad de clientes',
    example: '2024-12-31',
  })
  @IsDateString({}, { message: 'Fecha de fin debe tener formato válido' })
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Tipo de cliente a incluir',
    enum: ['individual', 'corporativo', 'todos'],
    example: 'todos',
  })
  @IsEnum(['individual', 'corporativo', 'todos'], {
    message: 'Tipo de cliente debe ser: individual, corporativo o todos',
  })
  @IsOptional()
  tipo_cliente?: 'individual' | 'corporativo' | 'todos';

  @ApiPropertyOptional({
    description: 'Incluir historial de compras del cliente',
    example: true,
  })
  @IsBoolean({ message: 'incluir_compras debe ser verdadero o falso' })
  @IsOptional()
  incluir_compras?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir valoraciones del cliente',
    example: false,
  })
  @IsBoolean({ message: 'incluir_valoraciones debe ser verdadero o falso' })
  @IsOptional()
  incluir_valoraciones?: boolean;

  @ApiPropertyOptional({
    description: 'Monto mínimo de compras para incluir cliente (en soles)',
    example: 500.0,
  })
  @IsNumber({}, { message: 'Monto mínimo debe ser un número' })
  @Min(0, { message: 'Monto mínimo no puede ser negativo' })
  @IsOptional()
  monto_minimo_compras?: number;
}

export class ReporteProductosParamsDto {
  @ApiPropertyOptional({
    description: 'ID de categoría para filtrar productos',
    example: 1,
  })
  @IsNumber({}, { message: 'ID de categoría debe ser un número' })
  @Min(1, { message: 'ID de categoría debe ser positivo' })
  @IsOptional()
  categoria_id?: number;

  @ApiPropertyOptional({
    description: 'ID de subcategoría para filtrar productos',
    example: 1,
  })
  @IsNumber({}, { message: 'ID de subcategoría debe ser un número' })
  @Min(1, { message: 'ID de subcategoría debe ser positivo' })
  @IsOptional()
  subcategoria_id?: number;

  @ApiPropertyOptional({
    description: 'Incluir información de stock actual',
    example: true,
  })
  @IsBoolean({ message: 'incluir_stock debe ser verdadero o falso' })
  @IsOptional()
  incluir_stock?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir historial de ventas del producto',
    example: true,
  })
  @IsBoolean({ message: 'incluir_ventas debe ser verdadero o falso' })
  @IsOptional()
  incluir_ventas?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir valoraciones del producto',
    example: false,
  })
  @IsBoolean({ message: 'incluir_valoraciones debe ser verdadero o falso' })
  @IsOptional()
  incluir_valoraciones?: boolean;

  @ApiPropertyOptional({
    description: 'Solo productos activos',
    example: true,
  })
  @IsBoolean({ message: 'solo_activos debe ser verdadero o falso' })
  @IsOptional()
  solo_activos?: boolean;
}

export class ReporteFinancieroParamsDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del período financiero',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Fecha de inicio debe tener formato válido' })
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del período financiero',
    example: '2024-12-31',
  })
  @IsDateString({}, { message: 'Fecha de fin debe tener formato válido' })
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Tipo de reporte financiero',
    enum: ['ventas', 'compras', 'general'],
    example: 'general',
  })
  @IsEnum(['ventas', 'compras', 'general'], {
    message: 'Tipo debe ser: ventas, compras o general',
  })
  @IsOptional()
  tipo?: 'ventas' | 'compras' | 'general';

  @ApiPropertyOptional({
    description: 'Incluir desglose de impuestos (IGV)',
    example: true,
  })
  @IsBoolean({ message: 'incluir_impuestos debe ser verdadero o falso' })
  @IsOptional()
  incluir_impuestos?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir detalles de transacciones',
    example: false,
  })
  @IsBoolean({ message: 'incluir_detalles debe ser verdadero o falso' })
  @IsOptional()
  incluir_detalles?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir proyecciones financieras',
    example: false,
  })
  @IsBoolean({ message: 'incluir_proyecciones debe ser verdadero o falso' })
  @IsOptional()
  incluir_proyecciones?: boolean;
}

// DTO principal mejorado para crear reportes

export class CreateReporteMejoradoDto {
  @ApiProperty({
    description: 'Nombre descriptivo del reporte',
    example: 'Reporte de Ventas Mensual - Enero 2024',
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del reporte',
    example:
      'Reporte detallado de ventas del mes de enero 2024, incluyendo análisis por productos y clientes',
    maxLength: 500,
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(0, 500, { message: 'La descripción no puede exceder 500 caracteres' })
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Tipo de reporte a generar',
    enum: TipoReporte,
    example: TipoReporte.VENTAS,
  })
  @IsEnum(TipoReporte, {
    message: `Tipo de reporte debe ser uno de: ${Object.values(TipoReporte).join(', ')}`,
  })
  tipo_reporte: TipoReporte;

  @ApiPropertyOptional({
    description: 'Parámetros específicos según el tipo de reporte',
    oneOf: [
      { $ref: '#/components/schemas/ReporteVentasParamsDto' },
      { $ref: '#/components/schemas/ReporteComprasParamsDto' },
      { $ref: '#/components/schemas/ReporteInventarioParamsDto' },
      { $ref: '#/components/schemas/ReporteClientesParamsDto' },
      { $ref: '#/components/schemas/ReporteProductosParamsDto' },
      { $ref: '#/components/schemas/ReporteFinancieroParamsDto' },
    ],
  })
  @IsObject({ message: 'Los parámetros deben ser un objeto válido' })
  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  parametros?:
    | ReporteVentasParamsDto
    | ReporteComprasParamsDto
    | ReporteInventarioParamsDto
    | ReporteClientesParamsDto
    | ReporteProductosParamsDto
    | ReporteFinancieroParamsDto;

  @ApiPropertyOptional({
    description: 'Formato de salida del reporte',
    enum: FormatoReporte,
    default: FormatoReporte.PDF,
    example: FormatoReporte.PDF,
  })
  @IsEnum(FormatoReporte, {
    message: `Formato debe ser uno de: ${Object.values(FormatoReporte).join(', ')}`,
  })
  @IsOptional()
  formato?: FormatoReporte;

  @ApiPropertyOptional({
    description: 'Configuración de programación automática del reporte',
    example: {
      frecuencia: 'mensual',
      dia_mes: 1,
      hora: '08:00',
      activo: true,
      email_destinatarios: ['admin@empresa.com'],
    },
  })
  @IsObject({ message: 'La programación debe ser un objeto válido' })
  @IsOptional()
  programacion?: {
    frecuencia: 'diario' | 'semanal' | 'mensual' | 'trimestral';
    dia_semana?: number; // 0-6 (domingo-sábado)
    dia_mes?: number; // 1-31
    hora: string; // HH:MM formato 24h
    activo: boolean;
    email_destinatarios?: string[];
  };

  @ApiPropertyOptional({
    description: 'Etiquetas para categorizar el reporte',
    example: ['ventas', 'mensual', 'productos'],
    maxItems: 10,
  })
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 etiquetas permitidas' })
  @IsString({
    each: true,
    message: 'Cada etiqueta debe ser una cadena de texto',
  })
  @IsOptional()
  etiquetas?: string[];

  @ApiPropertyOptional({
    description: 'Configuración específica para contexto peruano',
    example: {
      incluir_igv: true,
      formato_moneda: 'PEN',
      zona_horaria: 'America/Lima',
      formato_fecha: 'dd/MM/yyyy',
    },
  })
  @IsObject({ message: 'La configuración regional debe ser un objeto válido' })
  @IsOptional()
  configuracion_regional?: {
    incluir_igv?: boolean;
    formato_moneda?: 'PEN' | 'USD';
    zona_horaria?: string;
    formato_fecha?: string;
    idioma?: 'es' | 'en';
  };
}

// DTO para parámetros de consulta mejorados

export class ReporteQueryMejoradoDto {
  @ApiPropertyOptional({
    description: 'Número de página para paginación',
    example: 1,
    minimum: 1,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'La página debe ser un número' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    example: 50,
    minimum: 1,
    maximum: 1000,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'El límite debe ser un número' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(1000, { message: 'El límite no puede exceder 1000 registros' })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del reporte (formato: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString(
    {},
    { message: 'Fecha de inicio debe tener formato válido YYYY-MM-DD' },
  )
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del reporte (formato: YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsDateString(
    {},
    { message: 'Fecha de fin debe tener formato válido YYYY-MM-DD' },
  )
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Formato de exportación del reporte',
    enum: FormatoReporte,
    example: FormatoReporte.PDF,
  })
  @IsEnum(FormatoReporte, {
    message: `Formato debe ser uno de: ${Object.values(FormatoReporte).join(', ')}`,
  })
  @IsOptional()
  formato?: FormatoReporte;

  @ApiPropertyOptional({
    description: 'Incluir métricas calculadas en la respuesta',
    example: true,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'incluir_metricas debe ser verdadero o falso' })
  @IsOptional()
  incluir_metricas?: boolean = true;

  @ApiPropertyOptional({
    description: 'Incluir configuración regional en la respuesta',
    example: true,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'incluir_configuracion debe ser verdadero o falso' })
  @IsOptional()
  incluir_configuracion?: boolean = true;
}
