import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendEmailDto, TipoEmail, PrioridadEmail } from '../dto/send-email.dto';
import {
  CreatePlantillaDto,
  CategoriaPlantilla,
} from '../dto/create-plantilla.dto';
import { UpdatePlantillaDto } from '../dto/update-plantilla.dto';

@Injectable()
export class EmailValidationService {
  private readonly logger = new Logger(EmailValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validar datos de envío de email
   */
  async validateSendEmailData(
    sendEmailDto: SendEmailDto,
    empresaId: string,
  ): Promise<void> {
    // Validar formato de email
    this.validateEmailFormat(sendEmailDto.to);

    // Validar CC y BCC si existen
    if (sendEmailDto.cc) {
      sendEmailDto.cc.forEach((email) => this.validateEmailFormat(email));
    }
    if (sendEmailDto.bcc) {
      sendEmailDto.bcc.forEach((email) => this.validateEmailFormat(email));
    }

    // Validar longitud del asunto
    this.validateSubjectLength(sendEmailDto.subject);

    // Validar contenido HTML
    this.validateHtmlContent(sendEmailDto.htmlContent);

    // Validar límites de envío
    await this.validateSendingLimits(empresaId);

    // Validar plantilla si se especifica
    if (sendEmailDto.plantilla_id) {
      await this.validatePlantillaExists(
        sendEmailDto.plantilla_id.toString(),
        empresaId,
      );
    }

    // Validar fecha programada si se especifica
    if (sendEmailDto.fecha_programada) {
      this.validateScheduledDate(sendEmailDto.fecha_programada);
    }

    // Validar adjuntos si existen
    if (sendEmailDto.adjuntos && sendEmailDto.adjuntos.length > 0) {
      this.validateAttachments(sendEmailDto.adjuntos);
    }
  }

  /**
   * Validar formato de email
   */
  private validateEmailFormat(email: string): void {
    if (!this.isValidEmail(email)) {
      throw new BadRequestException(`Formato de email inválido: ${email}`);
    }
  }

  /**
   * Validar longitud del asunto
   */
  private validateSubjectLength(subject: string): void {
    if (!subject || subject.trim().length === 0) {
      throw new BadRequestException('El asunto es requerido');
    }

    if (subject.length > 200) {
      throw new BadRequestException(
        'El asunto no puede exceder 200 caracteres',
      );
    }
  }

  /**
   * Validar contenido HTML
   */
  private validateHtmlContent(htmlContent: string): void {
    if (!htmlContent || htmlContent.trim().length === 0) {
      throw new BadRequestException('El contenido HTML es requerido');
    }

    if (htmlContent.length > 100000) {
      throw new BadRequestException('El contenido HTML no puede exceder 100KB');
    }

    // Validar contenido spam
    this.validateSpamContent('', htmlContent);
  }

  /**
   * Validar fecha programada
   */
  private validateScheduledDate(fechaProgramada: string): void {
    const ahora = new Date();
    const fecha = new Date(fechaProgramada);

    if (fecha <= ahora) {
      throw new BadRequestException('La fecha programada debe ser futura');
    }

    // No permitir fechas muy lejanas (más de 1 año)
    const unAnoEnFuturo = new Date();
    unAnoEnFuturo.setFullYear(unAnoEnFuturo.getFullYear() + 1);

    if (fecha > unAnoEnFuturo) {
      throw new BadRequestException(
        'La fecha programada no puede ser mayor a 1 año',
      );
    }
  }

  /**
   * Validar adjuntos
   */
  private validateAttachments(adjuntos: any[]): void {
    if (adjuntos.length > 10) {
      throw new BadRequestException('No se pueden adjuntar más de 10 archivos');
    }

    let totalSize = 0;
    const maxFileSize = 10 * 1024 * 1024; // 10MB por archivo
    const maxTotalSize = 25 * 1024 * 1024; // 25MB total

    for (const adjunto of adjuntos) {
      if (!adjunto.nombre || adjunto.nombre.trim().length === 0) {
        throw new BadRequestException('Todos los adjuntos deben tener nombre');
      }

      if (!adjunto.contenido) {
        throw new BadRequestException(
          'Todos los adjuntos deben tener contenido',
        );
      }

      if (!adjunto.tipo_mime) {
        throw new BadRequestException(
          'Todos los adjuntos deben tener tipo MIME',
        );
      }

      // Validar tipo MIME
      this.validateMimeType(adjunto.tipo_mime);

      // Validar tamaño del archivo
      const fileSize = adjunto.contenido.length;
      if (fileSize > maxFileSize) {
        throw new BadRequestException(
          `El archivo ${adjunto.nombre} excede el tamaño máximo de 10MB`,
        );
      }

      totalSize += fileSize;
    }

    if (totalSize > maxTotalSize) {
      throw new BadRequestException('El tamaño total de adjuntos excede 25MB');
    }
  }

  /**
   * Obtener límites diarios
   */
  private getDailyLimits(): { maximo: number; advertencia: number } {
    // En producción, estos límites podrían venir de la configuración de la empresa
    return {
      maximo: 1000,
      advertencia: 800,
    };
  }

  /**
   * Validar datos de creación de plantilla
   */
  validateCreatePlantillaData(createPlantillaDto: CreatePlantillaDto): void {
    // Validar nombre
    if (
      !createPlantillaDto.nombre ||
      createPlantillaDto.nombre.trim().length === 0
    ) {
      throw new BadRequestException('El nombre de la plantilla es requerido');
    }

    if (createPlantillaDto.nombre.length > 100) {
      throw new BadRequestException(
        'El nombre no puede exceder 100 caracteres',
      );
    }

    // Validar descripción si existe
    if (
      createPlantillaDto.descripcion &&
      createPlantillaDto.descripcion.length > 500
    ) {
      throw new BadRequestException(
        'La descripción no puede exceder 500 caracteres',
      );
    }

    // Validar asunto
    if (
      !createPlantillaDto.asunto ||
      createPlantillaDto.asunto.trim().length === 0
    ) {
      throw new BadRequestException('El asunto de la plantilla es requerido');
    }

    if (createPlantillaDto.asunto.length > 200) {
      throw new BadRequestException(
        'El asunto no puede exceder 200 caracteres',
      );
    }

    // Validar contenido HTML
    if (
      !createPlantillaDto.contenido_html ||
      createPlantillaDto.contenido_html.trim().length === 0
    ) {
      throw new BadRequestException('El contenido HTML es requerido');
    }

    if (createPlantillaDto.contenido_html.length > 100000) {
      throw new BadRequestException('El contenido HTML no puede exceder 100KB');
    }

    // Validar contenido de texto si existe
    if (
      createPlantillaDto.contenido_texto &&
      createPlantillaDto.contenido_texto.length > 50000
    ) {
      throw new BadRequestException(
        'El contenido de texto no puede exceder 50KB',
      );
    }

    // Validar variables disponibles si existen
    if (
      createPlantillaDto.variables_disponibles &&
      createPlantillaDto.variables_disponibles.length > 0
    ) {
      for (const variable of createPlantillaDto.variables_disponibles) {
        if (!variable || variable.trim().length === 0) {
          throw new BadRequestException('Las variables no pueden estar vacías');
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
          throw new BadRequestException(
            `Variable '${variable}' tiene formato inválido`,
          );
        }
      }

      if (createPlantillaDto.variables_disponibles.length > 50) {
        throw new BadRequestException(
          'No se pueden definir más de 50 variables',
        );
      }
    }

    // Validar CSS personalizado si existe
    if (createPlantillaDto.css_personalizado) {
      if (createPlantillaDto.css_personalizado.length > 10000) {
        throw new BadRequestException(
          'El CSS personalizado no puede exceder 10KB',
        );
      }

      // Validar que no contenga JavaScript
      if (this.containsJavaScript(createPlantillaDto.css_personalizado)) {
        throw new BadRequestException('El CSS no puede contener JavaScript');
      }
    }

    // Validar tags si existen
    if (createPlantillaDto.tags && createPlantillaDto.tags.length > 0) {
      if (createPlantillaDto.tags.length > 10) {
        throw new BadRequestException('No se pueden asignar más de 10 tags');
      }

      for (const tag of createPlantillaDto.tags) {
        if (!tag || tag.trim().length === 0) {
          throw new BadRequestException('Los tags no pueden estar vacíos');
        }

        if (tag.length > 30) {
          throw new BadRequestException(
            'Los tags no pueden exceder 30 caracteres',
          );
        }
      }
    }

    // Validar que las variables en el contenido estén definidas
    this.validateTemplateVariables(createPlantillaDto);
  }

  /**
   * Validar datos de actualización de plantilla
   */
  validateUpdatePlantillaData(updatePlantillaDto: UpdatePlantillaDto): void {
    // Aplicar las mismas validaciones que para creación, pero solo para campos presentes
    if (updatePlantillaDto.nombre !== undefined) {
      if (
        !updatePlantillaDto.nombre ||
        updatePlantillaDto.nombre.trim().length === 0
      ) {
        throw new BadRequestException(
          'El nombre de la plantilla no puede estar vacío',
        );
      }

      if (updatePlantillaDto.nombre.length > 100) {
        throw new BadRequestException(
          'El nombre no puede exceder 100 caracteres',
        );
      }
    }

    if (
      updatePlantillaDto.descripcion !== undefined &&
      updatePlantillaDto.descripcion.length > 500
    ) {
      throw new BadRequestException(
        'La descripción no puede exceder 500 caracteres',
      );
    }

    if (updatePlantillaDto.asunto !== undefined) {
      if (
        !updatePlantillaDto.asunto ||
        updatePlantillaDto.asunto.trim().length === 0
      ) {
        throw new BadRequestException('El asunto no puede estar vacío');
      }

      if (updatePlantillaDto.asunto.length > 200) {
        throw new BadRequestException(
          'El asunto no puede exceder 200 caracteres',
        );
      }
    }

    if (updatePlantillaDto.contenido_html !== undefined) {
      if (
        !updatePlantillaDto.contenido_html ||
        updatePlantillaDto.contenido_html.trim().length === 0
      ) {
        throw new BadRequestException('El contenido HTML no puede estar vacío');
      }

      if (updatePlantillaDto.contenido_html.length > 100000) {
        throw new BadRequestException(
          'El contenido HTML no puede exceder 100KB',
        );
      }
    }

    if (
      updatePlantillaDto.contenido_texto !== undefined &&
      updatePlantillaDto.contenido_texto.length > 50000
    ) {
      throw new BadRequestException(
        'El contenido de texto no puede exceder 50KB',
      );
    }

    if (updatePlantillaDto.css_personalizado !== undefined) {
      if (updatePlantillaDto.css_personalizado.length > 10000) {
        throw new BadRequestException(
          'El CSS personalizado no puede exceder 10KB',
        );
      }

      if (this.containsJavaScript(updatePlantillaDto.css_personalizado)) {
        throw new BadRequestException('El CSS no puede contener JavaScript');
      }
    }

    if (
      updatePlantillaDto.tags !== undefined &&
      updatePlantillaDto.tags.length > 10
    ) {
      throw new BadRequestException('No se pueden asignar más de 10 tags');
    }
  }

  /**
   * Validar parámetros de paginación
   */
  validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new BadRequestException('La página debe ser mayor a 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100');
    }
  }

  /**
   * Validar filtros de emails
   */
  validateEmailFilters(filters: any): void {
    if (filters.tipo && !Object.values(TipoEmail).includes(filters.tipo)) {
      throw new BadRequestException('Tipo de email no válido');
    }

    if (
      filters.prioridad &&
      !Object.values(PrioridadEmail).includes(filters.prioridad)
    ) {
      throw new BadRequestException('Prioridad no válida');
    }

    if (filters.fecha_desde) {
      const fecha = new Date(filters.fecha_desde);
      if (isNaN(fecha.getTime())) {
        throw new BadRequestException('fecha_desde debe ser una fecha válida');
      }
    }

    if (filters.fecha_hasta) {
      const fecha = new Date(filters.fecha_hasta);
      if (isNaN(fecha.getTime())) {
        throw new BadRequestException('fecha_hasta debe ser una fecha válida');
      }
    }

    if (filters.fecha_desde && filters.fecha_hasta) {
      const desde = new Date(filters.fecha_desde);
      const hasta = new Date(filters.fecha_hasta);
      if (desde > hasta) {
        throw new BadRequestException(
          'fecha_desde no puede ser mayor que fecha_hasta',
        );
      }
    }

    if (filters.destinatario && typeof filters.destinatario !== 'string') {
      throw new BadRequestException('El filtro destinatario debe ser texto');
    }

    if (filters.asunto && typeof filters.asunto !== 'string') {
      throw new BadRequestException('El filtro asunto debe ser texto');
    }
  }

  /**
   * Validar filtros de plantillas
   */
  validatePlantillaFilters(filters: any): void {
    if (
      filters.tipo_email &&
      !Object.values(TipoEmail).includes(filters.tipo_email)
    ) {
      throw new BadRequestException('Tipo de email no válido');
    }

    if (
      filters.categoria &&
      !Object.values(CategoriaPlantilla).includes(filters.categoria)
    ) {
      throw new BadRequestException('Categoría no válida');
    }

    if (filters.activa !== undefined && typeof filters.activa !== 'boolean') {
      throw new BadRequestException('El filtro activa debe ser booleano');
    }

    if (filters.nombre && typeof filters.nombre !== 'string') {
      throw new BadRequestException('El filtro nombre debe ser texto');
    }

    if (filters.tags && !Array.isArray(filters.tags)) {
      throw new BadRequestException('El filtro tags debe ser un array');
    }
  }

  /**
   * Validar límites de envío para la empresa
   */
  async validateSendingLimits(empresaId: string): Promise<void> {
    try {
      const ahora = new Date();
      const inicioHoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
      );

      // Contar emails enviados hoy (simulado - en producción sería una consulta real)
      const emailsHoy = 0; // await this.prisma.email.count({ where: { empresaId, createdAt: { gte: inicioHoy } } });

      const limitesDiarios = this.getDailyLimits();

      if (emailsHoy >= limitesDiarios.maximo) {
        throw new BadRequestException(
          `Has alcanzado el límite diario de ${limitesDiarios.maximo} emails`,
        );
      }

      if (emailsHoy >= limitesDiarios.advertencia) {
        this.logger.warn(
          `Empresa ${empresaId} se acerca al límite diario: ${emailsHoy}/${limitesDiarios.maximo}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error validando límites de envío: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validar que existe la plantilla
   */
  async validatePlantillaExists(
    plantillaId: string,
    empresaId: string,
  ): Promise<void> {
    try {
      // Simulado - en producción sería una consulta real
      const plantilla: any = null; // await this.prisma.plantillaEmail.findFirst({ where: { id: plantillaId, empresaId } });

      if (!plantilla) {
        throw new BadRequestException(
          `La plantilla con ID ${plantillaId} no existe o no pertenece a tu empresa`,
        );
      }

      // Validar que la plantilla esté activa
      if (plantilla && plantilla.activa === false) {
        throw new BadRequestException(
          `La plantilla con ID ${plantillaId} está inactiva`,
        );
      }
    } catch (error) {
      this.logger.error(`Error validando plantilla: ${error.message}`);
      throw error;
    }
  }

  // Métodos auxiliares privados

  /**
   * Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar tipo MIME permitido
   */
  private validateMimeType(mimeType: string): void {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${mimeType}`,
      );
    }
  }

  /**
   * Validar contenido spam
   */
  private validateSpamContent(subject: string, content: string): void {
    const spamWords = [
      'URGENTE',
      'GRATIS',
      'OFERTA LIMITADA',
      'CLICK AQUÍ',
      'GARANTIZADO',
      'SIN COSTO',
      'DINERO FÁCIL',
      'PROMOCIÓN ESPECIAL',
    ];

    const textToCheck = `${subject} ${content}`.toUpperCase();
    let spamScore = 0;

    for (const word of spamWords) {
      if (textToCheck.includes(word)) {
        spamScore++;
      }
    }

    if (spamScore >= 3) {
      throw new BadRequestException('El contenido del email parece ser spam');
    }

    // Validar exceso de mayúsculas
    const upperCaseRatio =
      (subject.match(/[A-Z]/g) || []).length / subject.length;
    if (upperCaseRatio > 0.5 && subject.length > 10) {
      throw new BadRequestException('El asunto contiene demasiadas mayúsculas');
    }

    // Validar exceso de signos de exclamación
    const exclamationCount = (subject.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      throw new BadRequestException(
        'El asunto contiene demasiados signos de exclamación',
      );
    }
  }

  /**
   * Validar que el CSS no contiene JavaScript
   */
  private containsJavaScript(css: string): boolean {
    const jsPatterns = [
      /javascript:/i,
      /expression\s*\(/i,
      /behavior\s*:/i,
      /@import/i,
      /url\s*\(\s*javascript:/i,
    ];

    return jsPatterns.some((pattern) => pattern.test(css));
  }

  /**
   * Validar variables en plantilla
   */
  private validateTemplateVariables(
    createPlantillaDto: CreatePlantillaDto,
  ): void {
    const variablesDefinidas = createPlantillaDto.variables_disponibles || [];
    const contenidoCompleto = `${createPlantillaDto.asunto} ${createPlantillaDto.contenido_html} ${createPlantillaDto.contenido_texto || ''}`;

    // Extraer variables del contenido
    const variablesEnUso =
      contenidoCompleto.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || [];
    const variablesUnicas = [
      ...new Set(variablesEnUso.map((v) => v.replace(/\{\{\s*|\s*\}\}/g, ''))),
    ];

    // Verificar que todas las variables usadas estén definidas
    for (const variable of variablesUnicas) {
      if (!variablesDefinidas.includes(variable)) {
        this.logger.warn(
          `Variable '${variable}' usada pero no definida en variables_disponibles`,
        );
      }
    }

    // Verificar que no haya variables definidas pero no usadas
    for (const variable of variablesDefinidas) {
      if (!variablesUnicas.includes(variable)) {
        this.logger.warn(
          `Variable '${variable}' definida pero no usada en el contenido`,
        );
      }
    }
  }
}
