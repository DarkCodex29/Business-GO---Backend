export class CreateMensajeWhatsappDto {
  id_consulta: number;
  mensaje: string;
  es_entrante: boolean;
  tipo_mensaje?: string;
  url_archivo?: string;
  nombre_archivo?: string;
  tamanio_archivo?: number;
  procesado?: boolean;
  mensaje_id_wa?: string;
  estado_entrega?: string;
}
