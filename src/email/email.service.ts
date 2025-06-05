import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import {
  BaseEmailService,
  EmailResponse,
  EstadoEmail,
  TipoEmail,
  PrioridadEmail,
  PlantillaResponse,
  PaginatedEmailResponse,
  PaginatedPlantillaResponse,
} from './services/base-email.service';
import { EmailValidationService } from './services/email-validation.service';
import { EmailCalculationService } from './services/email-calculation.service';
import { SendEmailDto } from './dto/send-email.dto';
import { CreatePlantillaDto, UpdatePlantillaDto } from './dto';
import {
  EmailFormatted,
  PlantillaFormatted,
  MetricasEmail,
  EstadisticasEmail,
  TendenciaEmail,
  AnalisisRendimiento,
  ReporteDetallado,
} from './services/base-email.service';

@Injectable()
export class EmailService extends BaseEmailService {
  protected readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    protected readonly validationService: EmailValidationService,
    protected readonly calculationService: EmailCalculationService,
  ) {
    super(validationService, calculationService);

    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY no está configurado');
    }
    this.resend = new Resend(resendApiKey);
  }

  // Implementación de métodos abstractos de Email

  protected async preEmailSend(
    sendEmailDto: SendEmailDto,
    empresaId: string,
  ): Promise<void> {
    await this.validationService.validateSendEmailData(sendEmailDto, empresaId);
  }

  protected async prepareEmailData(
    sendEmailDto: SendEmailDto,
    empresaId: string,
    usuarioId: string,
  ): Promise<any> {
    return {
      ...sendEmailDto,
      empresa_id: empresaId,
      usuario_id: usuarioId,
      estado: EstadoEmail.PENDIENTE,
      intentos_envio: 0,
      seguimiento_apertura: sendEmailDto.seguimiento_apertura ?? true,
      seguimiento_clics: sendEmailDto.seguimiento_clics ?? true,
      prioridad: sendEmailDto.prioridad ?? PrioridadEmail.NORMAL,
      createdAt: new Date(),
    };
  }

  protected async executeEmailSend(
    emailData: any,
    empresaId: string,
  ): Promise<EmailResponse> {
    try {
      // Enviar email usando Resend
      const result = await this.resend.emails.send({
        from: this.configService.get<string>(
          'EMAIL_FROM',
          'noreply@businessgo.com',
        ),
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html: emailData.htmlContent,
        text: emailData.textContent,
        attachments: emailData.adjuntos?.map((adj: any) => ({
          filename: adj.nombre,
          content: adj.contenido,
          contentType: adj.tipo_mime,
        })),
      });

      // Simular guardado en base de datos (en producción sería una inserción real)
      const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: emailId,
        estado: EstadoEmail.ENVIADO,
        mensaje: 'Email enviado exitosamente',
        fecha_envio: new Date(),
        destinatario: emailData.to,
        asunto: emailData.subject,
      };
    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`);
      throw new BadRequestException(`Error enviando email: ${error.message}`);
    }
  }

  protected async postEmailSend(
    emailId: string,
    empresaId: string,
  ): Promise<void> {
    // Aquí se podría actualizar estadísticas, logs, etc.
    this.logger.log(`Post-procesamiento completado para email ${emailId}`);
  }

  protected async fetchEmails(
    empresaId: string,
    page: number,
    limit: number,
    filters?: any,
  ): Promise<any> {
    // Simulación de datos - en producción sería una consulta real a la base de datos
    const skip = (page - 1) * limit;

    // Datos simulados
    const totalEmails = 100;
    const emails = Array.from(
      { length: Math.min(limit, totalEmails - skip) },
      (_, i) => ({
        id: `email_${skip + i + 1}`,
        to: `usuario${skip + i + 1}@ejemplo.com`,
        subject: `Asunto del email ${skip + i + 1}`,
        estado: ['enviado', 'entregado', 'abierto', 'clic'][
          Math.floor(Math.random() * 4)
        ],
        tipo: ['bienvenida', 'promocion', 'notificacion'][
          Math.floor(Math.random() * 3)
        ],
        createdAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
        fecha_envio: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
      }),
    );

    return {
      data: emails,
      total: totalEmails,
      page,
      limit,
    };
  }

  protected formatEmailResponse(
    emails: any,
    page: number,
    limit: number,
  ): PaginatedEmailResponse {
    return {
      data: emails.data.map((email: any) => ({
        id: email.id,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        htmlContent: email.htmlContent || '',
        textContent: email.textContent,
        tipo: email.tipo,
        prioridad: email.prioridad || PrioridadEmail.NORMAL,
        estado: email.estado,
        fecha_envio: email.fecha_envio,
        fecha_programada: email.fecha_programada,
        fecha_entrega: email.fecha_entrega,
        fecha_apertura: email.fecha_apertura,
        intentos_envio: email.intentos_envio || 0,
        error_mensaje: email.error_mensaje,
        plantilla_id: email.plantilla_id,
        variables: email.variables,
        metadata: email.metadata,
        seguimiento_apertura: email.seguimiento_apertura || true,
        seguimiento_clics: email.seguimiento_clics || true,
        empresa_id: email.empresa_id || '',
        usuario_id: email.usuario_id,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt || email.createdAt,
      })),
      pagination: this.buildPaginationResponse(
        emails.data,
        emails.total,
        page,
        limit,
      ),
    };
  }

  // Implementación de métodos abstractos de Plantilla

  protected async prePlantillaCreate(
    createPlantillaDto: any,
    empresaId: string,
  ): Promise<void> {
    // Validaciones específicas para crear plantilla
    if (
      !createPlantillaDto.nombre ||
      createPlantillaDto.nombre.trim().length === 0
    ) {
      throw new BadRequestException('El nombre de la plantilla es requerido');
    }
  }

  protected async preparePlantillaData(
    createPlantillaDto: any,
    empresaId: string,
    usuarioId: string,
  ): Promise<any> {
    return {
      ...createPlantillaDto,
      empresa_id: empresaId,
      usuario_creador_id: usuarioId,
      activa: createPlantillaDto.activa ?? true,
      variables_disponibles: createPlantillaDto.variables_disponibles ?? [],
      tags: createPlantillaDto.tags ?? [],
      uso_count: 0,
      createdAt: new Date(),
    };
  }

  protected async executePlantillaCreate(
    plantillaData: any,
    empresaId: string,
  ): Promise<any> {
    // Simulación - en producción sería una inserción real
    const plantillaId = `plantilla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: plantillaId,
      ...plantillaData,
    };
  }

  protected async postCreatePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void> {
    this.logger.log(
      `Plantilla ${plantillaId} creada exitosamente por usuario ${usuarioId}`,
    );
  }

  protected async fetchPlantillas(
    empresaId: string,
    page: number,
    limit: number,
    filters?: any,
  ): Promise<any> {
    // Simulación de datos
    const skip = (page - 1) * limit;
    const totalPlantillas = 50;

    const plantillas = Array.from(
      { length: Math.min(limit, totalPlantillas - skip) },
      (_, i) => ({
        id: `plantilla_${skip + i + 1}`,
        nombre: `Plantilla ${skip + i + 1}`,
        tipo_email: ['bienvenida', 'promocion', 'notificacion'][
          Math.floor(Math.random() * 3)
        ],
        activa: Math.random() > 0.2,
        uso_count: Math.floor(Math.random() * 100),
        createdAt: new Date(
          Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
        ),
      }),
    );

    return {
      data: plantillas,
      total: totalPlantillas,
      page,
      limit,
    };
  }

  protected formatPlantillasResponse(
    plantillas: any,
    page: number,
    limit: number,
  ): PaginatedPlantillaResponse {
    return {
      data: plantillas.data.map((plantilla: any) => ({
        id: plantilla.id,
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        asunto: plantilla.asunto || '',
        contenido_html: plantilla.contenido_html || '',
        contenido_texto: plantilla.contenido_texto,
        tipo_email: plantilla.tipo_email,
        categoria: plantilla.categoria,
        variables_disponibles: plantilla.variables_disponibles || [],
        css_personalizado: plantilla.css_personalizado,
        activa: plantilla.activa,
        configuracion: plantilla.configuracion,
        tags: plantilla.tags || [],
        empresa_id: plantilla.empresa_id || '',
        uso_count: plantilla.uso_count,
        ultima_modificacion:
          plantilla.ultima_modificacion || plantilla.createdAt,
        createdAt: plantilla.createdAt,
        updatedAt: plantilla.updatedAt || plantilla.createdAt,
      })),
      pagination: this.buildPaginationResponse(
        plantillas.data,
        plantillas.total,
        page,
        limit,
      ),
    };
  }

  protected async fetchPlantillaById(
    plantillaId: string,
    empresaId: string,
  ): Promise<any> {
    // Simulación - en producción sería una consulta real
    return {
      id: plantillaId,
      nombre: `Plantilla ${plantillaId}`,
      tipo_email: 'bienvenida',
      asunto: 'Bienvenido a nuestra plataforma',
      contenido_html:
        '<h1>Bienvenido {{nombre}}</h1><p>Gracias por registrarte.</p>',
      contenido_texto: 'Bienvenido {{nombre}}. Gracias por registrarte.',
      activa: true,
      variables_disponibles: ['nombre', 'email'],
      tags: ['bienvenida', 'registro'],
      uso_count: 25,
      createdAt: new Date(),
    };
  }

  protected formatPlantillaResponse(plantilla: any): PlantillaResponse {
    return {
      id: plantilla.id,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      asunto: plantilla.asunto,
      contenido_html: plantilla.contenido_html,
      contenido_texto: plantilla.contenido_texto,
      tipo_email: plantilla.tipo_email,
      categoria: plantilla.categoria,
      variables_disponibles: plantilla.variables_disponibles,
      css_personalizado: plantilla.css_personalizado,
      activa: plantilla.activa,
      configuracion: plantilla.configuracion,
      tags: plantilla.tags,
      uso_count: plantilla.uso_count,
      fecha_creacion: plantilla.createdAt,
    };
  }

  protected async prePlantillaUpdate(
    plantillaId: string,
    updatePlantillaDto: any,
    empresaId: string,
  ): Promise<void> {
    // Validar que la plantilla existe
    const plantilla = await this.fetchPlantillaById(plantillaId, empresaId);
    if (!plantilla) {
      throw new NotFoundException(`Plantilla ${plantillaId} no encontrada`);
    }
  }

  protected async preparePlantillaUpdateData(
    updatePlantillaDto: any,
    empresaId: string,
    usuarioId: string,
  ): Promise<any> {
    return {
      ...updatePlantillaDto,
      updatedAt: new Date(),
      usuario_actualizador_id: usuarioId,
    };
  }

  protected async executePlantillaUpdate(
    plantillaId: string,
    plantillaData: any,
    empresaId: string,
  ): Promise<any> {
    // Simulación - en producción sería una actualización real
    const plantillaExistente = await this.fetchPlantillaById(
      plantillaId,
      empresaId,
    );

    return {
      ...plantillaExistente,
      ...plantillaData,
      id: plantillaId,
    };
  }

  protected async postUpdatePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void> {
    this.logger.log(
      `Plantilla ${plantillaId} actualizada por usuario ${usuarioId}`,
    );
  }

  protected async prePlantillaDelete(
    plantillaId: string,
    empresaId: string,
  ): Promise<void> {
    // Validar que la plantilla existe
    const plantilla = await this.fetchPlantillaById(plantillaId, empresaId);
    if (!plantilla) {
      throw new NotFoundException(`Plantilla ${plantillaId} no encontrada`);
    }
  }

  protected async executePlantillaDelete(
    plantillaId: string,
    empresaId: string,
  ): Promise<void> {
    // Simulación - en producción sería una eliminación real
    this.logger.log(`Eliminando plantilla ${plantillaId}`);
  }

  protected async postDeletePlantilla(
    plantillaId: string,
    empresaId: string,
    usuarioId: string,
  ): Promise<void> {
    this.logger.log(
      `Plantilla ${plantillaId} eliminada por usuario ${usuarioId}`,
    );
  }

  // Métodos específicos del servicio

  async sendWelcomeEmail(
    to: string,
    variables: Record<string, any>,
    empresaId: string,
  ): Promise<EmailResponse> {
    const sendEmailDto: SendEmailDto = {
      to: to,
      subject: 'Bienvenido a BusinessGo',
      htmlContent: `<h1>Bienvenido ${variables.nombre || 'Usuario'}</h1><p>Gracias por unirte a nuestra plataforma.</p>`,
      tipo: TipoEmail.BIENVENIDA,
      variables,
    };

    return this.sendEmail(sendEmailDto, empresaId, 'system');
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    empresaId: string,
  ): Promise<EmailResponse> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    const sendEmailDto: SendEmailDto = {
      to: to,
      subject: 'Recuperación de contraseña',
      htmlContent: `<h1>Recuperación de contraseña</h1><p>Haz clic <a href="${resetUrl}">aquí</a> para restablecer tu contraseña.</p>`,
      tipo: TipoEmail.RECUPERACION_PASSWORD,
      variables: { resetUrl },
    };

    return this.sendEmail(sendEmailDto, empresaId, 'system');
  }

  async sendAppointmentConfirmation(
    to: string,
    appointmentData: any,
    empresaId: string,
  ): Promise<EmailResponse> {
    const sendEmailDto: SendEmailDto = {
      to: to,
      subject: 'Confirmación de cita',
      htmlContent: `<h1>Cita confirmada</h1><p>Tu cita para el ${appointmentData.fecha} a las ${appointmentData.hora} ha sido confirmada.</p>`,
      tipo: TipoEmail.CONFIRMACION_CITA,
      variables: appointmentData,
    };

    return this.sendEmail(sendEmailDto, empresaId, 'system');
  }

  // Método para enviar con plantilla
  async sendEmailWithTemplate(
    templateId: string,
    to: string[],
    variables: Record<string, any>,
    empresaId: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      prioridad?: PrioridadEmail;
      fecha_programada?: Date;
    },
  ): Promise<EmailResponse> {
    const plantilla = await this.getPlantillaById(templateId, empresaId);

    if (!plantilla) {
      throw new NotFoundException(`Plantilla ${templateId} no encontrada`);
    }

    const sendEmailDto: SendEmailDto = {
      to: to[0], // Tomar el primer destinatario
      subject: this.processTemplate(plantilla.asunto, variables),
      htmlContent: this.processTemplate(plantilla.contenido_html, variables),
      textContent: plantilla.contenido_texto
        ? this.processTemplate(plantilla.contenido_texto, variables)
        : undefined,
      tipo: plantilla.tipo_email,
      plantilla_id: parseInt(templateId),
      variables,
      cc: options?.cc,
      bcc: options?.bcc,
      prioridad: options?.prioridad,
      fecha_programada: options?.fecha_programada?.toISOString(),
    };

    return this.sendEmail(sendEmailDto, empresaId, 'system');
  }

  // Método para procesar plantillas
  private processTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let processed = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    });

    return processed;
  }

  // Métodos de métricas y análisis

  async getMetricasGenerales(empresaId: string): Promise<any> {
    // Obtener emails simulados para cálculos
    const emails = await this.fetchEmails(empresaId, 1, 1000);
    return this.calculationService.calculateMetricasGenerales(emails.data);
  }

  async getEstadisticasEmail(empresaId: string): Promise<any> {
    const emails = await this.fetchEmails(empresaId, 1, 1000);
    return this.calculationService.calculateEstadisticasEmail(emails.data);
  }

  async getTendenciaEmail(
    empresaId: string,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<any> {
    const emails = await this.fetchEmails(empresaId, 1, 1000);
    return this.calculationService.calculateTendenciaEmail(
      emails.data,
      fechaInicio,
      fechaFin,
    );
  }

  async getAnalisisRendimiento(empresaId: string): Promise<any> {
    const emails = await this.fetchEmails(empresaId, 1, 1000);
    return this.calculationService.calculateAnalisisRendimiento(emails.data);
  }

  async getReporteDetallado(
    empresaId: string,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<any> {
    const emails = await this.fetchEmails(empresaId, 1, 1000);
    return this.calculationService.generateReporteDetallado(
      emails.data,
      fechaInicio,
      fechaFin,
    );
  }
}
