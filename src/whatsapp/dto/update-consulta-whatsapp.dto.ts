import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

/**
 * DTO para actualizar consultas de WhatsApp
 * Contexto: Específico para el mercado peruano
 */
export class UpdateConsultaWhatsappDto {
  id_empresa?: number;
  id_cliente?: number;
  numero_telefono?: string;
  nombre_contacto?: string;
  tipo_consulta?: TipoConsulta;
  estado_consulta?: EstadoConsulta;
  mensaje_original?: string;
  respuesta_automatica?: string;
  procesado_por_ia?: boolean;
  requiere_atencion?: boolean;
  tiempo_respuesta?: number;
  satisfaccion?: number;
  notas_internas?: string;
  id_cotizacion?: number;
}
