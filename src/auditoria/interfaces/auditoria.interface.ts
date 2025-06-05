import { TipoAccion, TipoRecurso, NivelSeveridad } from '../dto';

export interface AuditoriaFormatted {
  id: string;
  accion: TipoAccion;
  recurso: TipoRecurso;
  recurso_id?: string;
  descripcion: string;
  severidad: NivelSeveridad;
  datos_anteriores?: Record<string, any>;
  datos_nuevos?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  usuario_id?: string;
  usuario_nombre?: string;
  empresa_id: string;
  empresa_nombre?: string;
  fecha_evento: Date;
}

export interface PaginatedAuditoriaResponse {
  data: AuditoriaFormatted[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AuditoriaStats {
  total_eventos: number;
  eventos_por_accion: Record<TipoAccion, number>;
  eventos_por_recurso: Record<TipoRecurso, number>;
  eventos_por_severidad: Record<NivelSeveridad, number>;
  eventos_por_usuario: Array<{
    usuario_id: string;
    usuario_nombre: string;
    total_eventos: number;
  }>;
  eventos_por_dia: Array<{
    fecha: string;
    total_eventos: number;
  }>;
  ips_mas_activas: Array<{
    ip_address: string;
    total_eventos: number;
  }>;
  recursos_mas_modificados: Array<{
    recurso: TipoRecurso;
    recurso_id: string;
    total_modificaciones: number;
  }>;
}

export interface AuditoriaFilters {
  accion?: TipoAccion;
  recurso?: TipoRecurso;
  recurso_id?: string;
  usuario_id?: string;
  severidad?: NivelSeveridad;
  fecha_inicio?: string;
  fecha_fin?: string;
  buscar?: string;
  ip_address?: string;
  acciones?: TipoAccion[];
  recursos?: TipoRecurso[];
  solo_criticos?: boolean;
  excluir_lectura?: boolean;
}

export interface AuditoriaExportOptions {
  formato: 'csv' | 'excel' | 'pdf';
  filtros?: AuditoriaFilters;
  incluir_metadatos?: boolean;
  incluir_datos_cambios?: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface AuditoriaContext {
  usuario_id?: string;
  empresa_id: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export interface IAuditoriaService {
  // Métodos principales
  registrarEvento(
    data: any,
    context: AuditoriaContext,
  ): Promise<AuditoriaFormatted>;
  obtenerEventos(
    empresaId: string,
    page: number,
    limit: number,
    filtros?: AuditoriaFilters,
  ): Promise<PaginatedAuditoriaResponse>;
  obtenerEventoPorId(
    id: string,
    empresaId: string,
  ): Promise<AuditoriaFormatted | null>;

  // Métodos de estadísticas
  obtenerEstadisticas(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<AuditoriaStats>;

  // Métodos de exportación
  exportarEventos(
    empresaId: string,
    opciones: AuditoriaExportOptions,
  ): Promise<Buffer>;

  // Métodos de limpieza
  limpiarEventosAntiguos(diasRetencion: number): Promise<number>;

  // Métodos de validación
  validarAcceso(usuarioId: string, empresaId: string): Promise<boolean>;
}
