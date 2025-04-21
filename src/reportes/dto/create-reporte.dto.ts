import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum TipoReporte {
  VENTAS = 'ventas',
  COMPRAS = 'compras',
  INVENTARIO = 'inventario',
  CLIENTES = 'clientes',
  PRODUCTOS = 'productos',
  FINANCIERO = 'financiero',
}

export enum FormatoReporte {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class CreateReporteDto {
  @ApiProperty({
    description: 'Nombre del reporte',
    example: 'Reporte de Ventas Mensual',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del reporte',
    example: 'Reporte detallado de ventas del mes actual',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Tipo de reporte',
    enum: TipoReporte,
    example: TipoReporte.VENTAS,
  })
  @IsEnum(TipoReporte)
  tipo_reporte: TipoReporte;

  @ApiPropertyOptional({
    description: 'Parámetros específicos del reporte',
    example: { fecha_inicio: '2024-01-01', fecha_fin: '2024-01-31' },
  })
  @IsObject()
  @IsOptional()
  parametros?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Formato de salida del reporte',
    enum: FormatoReporte,
    default: FormatoReporte.PDF,
  })
  @IsEnum(FormatoReporte)
  @IsOptional()
  formato?: FormatoReporte;

  @ApiPropertyOptional({
    description: 'Configuración de programación del reporte',
    example: { frecuencia: 'diario', hora: '08:00' },
  })
  @IsObject()
  @IsOptional()
  programacion?: Record<string, any>;
}
