/**
 * DTO para actualizar configuración de WhatsApp
 * Contexto: Específico para el mercado peruano
 */
export class UpdateConfiguracionWhatsappDto {
  id_empresa?: number;
  token_api?: string;
  webhook_url?: string;
  numero_whatsapp?: string;
  nombre_negocio?: string;
  instancia_id?: string;
  activo?: boolean;
  horario_atencion?: {
    inicio: string;
    fin: string;
    dias: string[];
  };
  mensaje_bienvenida?: string;
  mensaje_ausencia?: string;
  mensaje_despedida?: string;
  respuestas_automaticas?: boolean;
  ia_habilitada?: boolean;
}
