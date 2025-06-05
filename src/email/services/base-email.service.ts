import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto, TipoEmail, PrioridadEmail } from '../dto/send-email.dto';
import {
  CreatePlantillaDto,
  CategoriaPlantilla,
} from '../dto/create-plantilla.dto';
import { UpdatePlantillaDto } from '../dto/update-plantilla.dto';

// Re-exportar enums y tipos para uso externo
export { TipoEmail, PrioridadEmail } from '../dto/send-email.dto';
export { CategoriaPlantilla } from '../dto/create-plantilla.dto';

// Re-exportar interfaces de cálculo
export type {
  EstadisticasEmail,
  TendenciaEmail,
  AnalisisRendimiento,
  ReporteDetallado,
} from './email-calculation.service';

// Interfaces para filtros
export interface EmailFilters {
  tipo?: TipoEmail;
  estado?: EstadoEmail;
  fecha_desde?: string;
  fecha_hasta?: string;
  destinatario?: string;
  asunto?: string;
}

export interface PlantillaFilters {
  tipo_email?: TipoEmail;
  categoria?: CategoriaPlantilla;
  activa?: boolean;
  nombre?: string;
  tags?: string[];
}

// Interfaces para respuestas
export interface PlantillaResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  asunto: string;
  contenido_html: string;
  contenido_texto?: string;
  tipo_email: TipoEmail;
  categoria?: CategoriaPlantilla;
  variables_disponibles: string[];
  css_personalizado?: string;
  activa: boolean;
  configuracion?: Record<string, any>;
  tags: string[];
  uso_count: number;
  fecha_creacion: Date;
}

export interface PaginatedEmailResponse {
  data: EmailFormatted[];
  pagination: PaginationMeta;
}

export interface PaginatedPlantillaResponse {
  data: PlantillaFormatted[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Interfaces para el módulo de email
export interface EmailFormatted {
  id: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tipo: TipoEmail;
  prioridad: PrioridadEmail;
  estado: EstadoEmail;
  fecha_envio?: Date;
  fecha_programada?: Date;
  fecha_entrega?: Date;
  fecha_apertura?: Date;
  intentos_envio: number;
  error_mensaje?: string;
  plantilla_id?: number;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  seguimiento_apertura: boolean;
  seguimiento_clics: boolean;
  empresa_id: string;
  usuario_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlantillaFormatted {
  id: string;
  nombre: string;
  descripcion?: string;
  asunto: string;
  contenido_html: string;
  contenido_texto?: string;
  tipo_email: TipoEmail;
  categoria: CategoriaPlantilla;
  variables_disponibles: string[];
  css_personalizado?: string;
  activa: boolean;
  configuracion?: Record<string, any>;
  tags: string[];
  empresa_id: string;
  uso_count: number;
  ultima_modificacion: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedEmails {
  data: EmailFormatted[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedPlantillas {
  data: PlantillaFormatted[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MetricasEmail {
  total_enviados: number;
  total_entregados: number;
  total_abiertos: number;
  total_clics: number;
  tasa_entrega: number;
  tasa_apertura: number;
  tasa_clics: number;
  emails_por_tipo: {
    tipo: TipoEmail;
    cantidad: number;
    tasa_entrega: number;
  }[];
  emails_por_estado: {
    estado: EstadoEmail;
    cantidad: number;
    porcentaje: number;
  }[];
  tendencia_diaria: {
    fecha: string;
    enviados: number;
    entregados: number;
    abiertos: number;
  }[];
  plantillas_mas_usadas: {
    plantilla: PlantillaFormatted;
    usos: number;
  }[];
}

export enum EstadoEmail {
  PENDIENTE = 'pendiente',
  ENVIANDO = 'enviando',
  ENVIADO = 'enviado',
  ENTREGADO = 'entregado',
  ABIERTO = 'abierto',
  CLIC = 'clic',
  REBOTADO = 'rebotado',
  SPAM = 'spam',
  ERROR = 'error',
  CANCELADO = 'cancelado',
}

export interface EmailResponse {
  id: string;
  estado: EstadoEmail;
  mensaje: string;
  fecha_envio?: Date;
  destinatario?: string;
  asunto?: string;
}

@Injectable()
export abstract class BaseEmailService {
  protected readonly logger = new Logger(BaseEmailService.name);

  constructor(
    protected readonly validationService: any,
    protected readonly calculationService: any,
  ) {}

  /**
   * Template Method: Proceso principal de envío de email
   */
  async sendEmail(
    sendEmailDto: SendEmailDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<EmailResponse> {
    try {
      this.logger.log(`Iniciando envío de email para empresa ${empresaId}`);

      // 1. Pre-validaciones
      await this.preEmailSend(sendEmailDto, empresaId);

      // 2. Preparar datos del email
      const emailData = await this.prepareEmailData(
        sendEmailDto,
        empresaId,
        usuarioId,
      );

      // 3. Ejecutar envío
      const result = await this.executeEmailSend(emailData, empresaId);

      // 4. Post-procesamiento
      await this.postEmailSend(result.id, empresaId);

      this.logger.log(`Email enviado exitosamente: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Template Method: Proceso de obtener emails
   */
  async getEmails(
    empresaId: string,
    page: number = 1,
    limit: number = 10,
    filters?: EmailFilters,
  ): Promise<PaginatedEmailResponse> {
    try {
      this.logger.log(`Obteniendo emails para empresa ${empresaId}`);

      // 1. Validar parámetros
      this.validatePaginationParams(page, limit);

      // 2. Obtener emails
      const emails = await this.fetchEmails(empresaId, page, limit, filters);

      // 3. Formatear respuesta
      return this.formatEmailResponse(emails, page, limit);
    } catch (error) {
      this.logger.error(`Error obteniendo emails: ${error.message}`);
      throw error;
    }
  }

  /**
   * Template Method: Proceso de crear plantilla
   */
  async createPlantilla(
    createPlantillaDto: CreatePlantillaDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<PlantillaResponse> {
    try {
      this.logger.log(`Creando plantilla para empresa ${empresaId}`);

      // 1. Pre-validaciones
      await this.prePlantillaCreate(createPlantillaDto, empresaId);

      // 2. Preparar datos
      const plantillaData = await this.preparePlantillaData(
        createPlantillaDto,
        empresaId,
        usuarioId,
      );

      // 3. Crear plantilla
      const plantilla = await this.executePlantillaCreate(
        plantillaData,
        empresaId,
      );

      // 4. Post-procesamiento
      await this.postCreatePlantilla(plantilla.id, empresaId, usuarioId);

      // 5. Formatear respuesta
      return this.formatPlantillaResponse(plantilla);
    } catch (error) {
      this.logger.error(`Error creando plantilla: ${error.message}`);
      throw error;
    }
  }

  /**
   * Template Method: Proceso de obtener plantillas
   */
  async getPlantillas(
    empresaId: string,
    page: number = 1,
    limit: number = 10,
    filters?: PlantillaFilters,
  ): Promise<PaginatedPlantillaResponse> {
    try {
      this.logger.log(`Obteniendo plantillas para empresa ${empresaId}`);

      // 1. Validar parámetros
      this.validatePaginationParams(page, limit);

      // 2. Obtener plantillas
      const plantillas = await this.fetchPlantillas(
        empresaId,
        page,
        limit,
        filters,
      );

      // 3. Formatear respuesta
      return this.formatPlantillasResponse(plantillas, page, limit);
    } catch (error) {
      this.logger.error(`Error obteniendo plantillas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Template Method: Proceso de obtener plantilla por ID
   */
  async getPlantillaById(
    plantillaId: string,
    empresaId: string,
  ): Promise<PlantillaResponse> {
    try {
      this.logger.log(
        `Obteniendo plantilla ${plantillaId} para empresa ${empresaId}`,
      );

      // 1. Obtener plantilla
      const plantilla = await this.fetchPlantillaById(plantillaId, empresaId);

      // 2. Formatear respuesta
      return this.formatPlantillaResponse(plantilla);
    } catch (error) {
      this.logger.error(`Error obteniendo plantilla: ${error.message}`);
      throw error;
    }
  }

  /**
   * Template Method: Proceso de actualizar plantilla
   */
  async updatePlantilla(
    plantillaId: string,
    updatePlantillaDto: UpdatePlantillaDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<PlantillaResponse> {
    try {
      this.logger.log(
        `Actualizando plantilla ${plantillaId} para empresa ${empresaId}`,
      );

      // 1. Pre-validaciones
      await this.prePlantillaUpdate(plantillaId, updatePlantillaDto, empresaId);

      // 2. Preparar datos
      const plantillaData = await this.preparePlantillaUpdateData(
        updatePlantillaDto,
        empresaId,
        usuarioId,
      );

      // 3. Actualizar plantilla
      const plantilla = await this.executePlantillaUpdate(
        plantillaId,
        plantillaData,
        empresaId,
      );

      // 4. Post-procesamiento
      await this.postUpdatePlantilla(plantillaId, empresaId, usuarioId);

      // 5. Formatear respuesta
      return this.formatPlantillaResponse(plantilla);
    } catch (error) {
      this.logger.error(`Error actualizando plantilla: ${error.message}`);
      throw error;
    }
  }

  /**
   * Template Method: Proceso de eliminar plantilla
   */
  async deletePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Eliminando plantilla ${plantillaId} para empresa ${empresaId}`,
      );

      // 1. Pre-validaciones
      await this.prePlantillaDelete(plantillaId, empresaId);

      // 2. Eliminar plantilla
      await this.executePlantillaDelete(plantillaId, empresaId);

      // 3. Post-procesamiento
      await this.postDeletePlantilla(plantillaId, empresaId, usuarioId);
    } catch (error) {
      this.logger.error(`Error eliminando plantilla: ${error.message}`);
      throw error;
    }
  }

  // Métodos abstractos que deben implementar las clases hijas

  // Métodos de Email
  protected abstract preEmailSend(
    sendEmailDto: SendEmailDto,
    empresaId: string,
  ): Promise<void>;
  protected abstract prepareEmailData(
    sendEmailDto: SendEmailDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<any>;
  protected abstract executeEmailSend(
    emailData: any,
    empresaId: string,
  ): Promise<EmailResponse>;
  protected abstract postEmailSend(
    emailId: string,
    empresaId: string,
  ): Promise<void>;
  protected abstract fetchEmails(
    empresaId: string,
    page: number,
    limit: number,
    filters?: EmailFilters,
  ): Promise<any>;
  protected abstract formatEmailResponse(
    emails: any,
    page: number,
    limit: number,
  ): PaginatedEmailResponse;

  // Métodos de Plantilla
  protected abstract prePlantillaCreate(
    createPlantillaDto: CreatePlantillaDto,
    empresaId: string,
  ): Promise<void>;
  protected abstract preparePlantillaData(
    createPlantillaDto: CreatePlantillaDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<any>;
  protected abstract executePlantillaCreate(
    plantillaData: any,
    empresaId: string,
  ): Promise<any>;
  protected abstract postCreatePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void>;
  protected abstract fetchPlantillas(
    empresaId: string,
    page: number,
    limit: number,
    filters?: PlantillaFilters,
  ): Promise<any>;
  protected abstract formatPlantillasResponse(
    plantillas: any,
    page: number,
    limit: number,
  ): PaginatedPlantillaResponse;
  protected abstract fetchPlantillaById(
    plantillaId: string,
    empresaId: string,
  ): Promise<any>;
  protected abstract formatPlantillaResponse(plantilla: any): PlantillaResponse;
  protected abstract prePlantillaUpdate(
    plantillaId: string,
    updatePlantillaDto: UpdatePlantillaDto,
    empresaId: string,
  ): Promise<void>;
  protected abstract preparePlantillaUpdateData(
    updatePlantillaDto: UpdatePlantillaDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<any>;
  protected abstract executePlantillaUpdate(
    plantillaId: string,
    plantillaData: any,
    empresaId: string,
  ): Promise<any>;
  protected abstract postUpdatePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void>;
  protected abstract prePlantillaDelete(
    plantillaId: string,
    empresaId: string,
  ): Promise<void>;
  protected abstract executePlantillaDelete(
    plantillaId: string,
    empresaId: string,
  ): Promise<void>;
  protected abstract postDeletePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void>;

  // Métodos de utilidad compartidos
  protected validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new Error('La página debe ser mayor a 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('El límite debe estar entre 1 y 100');
    }
  }

  protected buildPaginationResponse(
    data: any[],
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
