import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultaWhatsappDto } from '../dto/create-consulta-whatsapp.dto';
import { CreateMensajeWhatsappDto } from '../dto/create-mensaje-whatsapp.dto';
import { CreateConfiguracionWhatsappDto } from '../dto/create-configuracion-whatsapp.dto';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

/**
 * Servicio especializado para validaciones de WhatsApp
 * Principio: Single Responsibility - Solo maneja validaciones
 * Contexto: Validaciones específicas para el mercado peruano
 */
@Injectable()
export class WhatsappValidationService {
  private readonly logger = new Logger(WhatsappValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida datos para crear una consulta de WhatsApp
   * Incluye validaciones específicas para Perú (números de teléfono, etc.)
   */
  async validateConsultaCreation(
    dto: CreateConsultaWhatsappDto,
  ): Promise<void> {
    this.logger.log(
      `Validando creación de consulta WhatsApp para empresa ${dto.id_empresa}`,
    );

    // Validar que la empresa existe y está activa
    await this.validateEmpresaExists(dto.id_empresa);

    // Validar número de teléfono peruano
    this.validatePeruvianPhoneNumber(dto.numero_telefono);

    // Validar cliente si se proporciona
    if (dto.id_cliente) {
      await this.validateClienteExists(dto.id_cliente, dto.id_empresa);
    }

    // Validar cotización si se proporciona
    if (dto.id_cotizacion) {
      await this.validateCotizacionExists(dto.id_cotizacion, dto.id_empresa);
    }

    // Validar tipo de consulta
    this.validateTipoConsulta(dto.tipo_consulta);

    // Validar estado de consulta
    this.validateEstadoConsulta(dto.estado_consulta);

    // Validar mensaje original no esté vacío
    this.validateMensajeOriginal(dto.mensaje_original);

    this.logger.log('Validación de consulta WhatsApp completada exitosamente');
  }

  /**
   * Valida datos para crear un mensaje de WhatsApp
   */
  async validateMensajeCreation(dto: CreateMensajeWhatsappDto): Promise<void> {
    this.logger.log(
      `Validando creación de mensaje WhatsApp para consulta ${dto.id_consulta}`,
    );

    // Validar que la consulta existe
    await this.validateConsultaExists(dto.id_consulta);

    // Validar contenido del mensaje
    this.validateMensajeContent(dto.mensaje);

    // Validar tipo de mensaje
    if (dto.tipo_mensaje) {
      this.validateTipoMensaje(dto.tipo_mensaje);
    }

    this.logger.log('Validación de mensaje WhatsApp completada exitosamente');
  }

  /**
   * Valida datos para crear configuración de WhatsApp
   */
  async validateConfiguracionCreation(
    dto: CreateConfiguracionWhatsappDto,
  ): Promise<void> {
    this.logger.log(
      `Validando configuración WhatsApp para empresa ${dto.id_empresa}`,
    );

    // Validar que la empresa existe
    await this.validateEmpresaExists(dto.id_empresa);

    // Validar que no existe configuración previa
    await this.validateConfiguracionNotExists(dto.id_empresa);

    // Validar token de API si se proporciona
    if (dto.token_api) {
      this.validateEvolutionApiToken(dto.token_api);
    }

    // Validar URL de webhook
    this.validateWebhookUrl(dto.webhook_url);

    // Validar número de teléfono empresarial peruano
    this.validatePeruvianBusinessPhone(dto.numero_whatsapp);

    // Validar mensajes automáticos
    this.validateMensajesAutomaticos(dto);

    this.logger.log(
      'Validación de configuración WhatsApp completada exitosamente',
    );
  }

  /**
   * Valida que una empresa existe y está activa
   */
  private async validateEmpresaExists(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findFirst({
      where: {
        id_empresa: empresaId,
      },
      select: {
        id_empresa: true,
        nombre: true,
      },
    });

    if (!empresa) {
      throw new BadRequestException(
        `Empresa con ID ${empresaId} no encontrada`,
      );
    }
  }

  /**
   * Valida formato de número de teléfono peruano
   * Formatos válidos: +51XXXXXXXXX, 51XXXXXXXXX, 9XXXXXXXX
   */
  private validatePeruvianPhoneNumber(telefono: string): void {
    const peruPhoneRegex = /^(\+51|51)?[9][0-9]{8}$/;

    if (!peruPhoneRegex.test(telefono.replace(/\s+/g, ''))) {
      throw new BadRequestException(
        'Número de teléfono inválido. Debe ser un número peruano válido (ej: +51987654321)',
      );
    }
  }

  /**
   * Valida formato de número de teléfono empresarial peruano
   * Incluye números fijos y móviles
   */
  private validatePeruvianBusinessPhone(telefono: string): void {
    const businessPhoneRegex = /^(\+51|51)?([1-9][0-9]{6,8})$/;

    if (!businessPhoneRegex.test(telefono.replace(/\s+/g, ''))) {
      throw new BadRequestException(
        'Número de teléfono empresarial inválido. Debe ser un número peruano válido',
      );
    }
  }

  /**
   * Valida que un cliente existe y pertenece a la empresa
   */
  private async validateClienteExists(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id_cliente: clienteId,
        empresas: {
          some: {
            empresa: {
              id_empresa: empresaId,
            },
          },
        },
      },
      select: {
        id_cliente: true,
        nombre: true,
      },
    });

    if (!cliente) {
      throw new BadRequestException(
        `Cliente con ID ${clienteId} no encontrado o no pertenece a la empresa`,
      );
    }
  }

  /**
   * Valida que una cotización existe y pertenece a la empresa
   */
  private async validateCotizacionExists(
    cotizacionId: number,
    empresaId: number,
  ): Promise<void> {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: {
        id_cotizacion: cotizacionId,
        id_empresa: empresaId,
      },
      select: {
        id_cotizacion: true,
        total: true,
        estado: true,
      },
    });

    if (!cotizacion) {
      throw new BadRequestException(
        `Cotización con ID ${cotizacionId} no encontrada o no pertenece a la empresa`,
      );
    }
  }

  /**
   * Valida que una consulta existe
   */
  private async validateConsultaExists(consultaId: number): Promise<void> {
    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: consultaId },
      select: {
        id_consulta: true,
        estado_consulta: true,
      },
    });

    if (!consulta) {
      throw new BadRequestException(
        `Consulta con ID ${consultaId} no encontrada`,
      );
    }
  }

  /**
   * Valida que un remitente (usuario) existe
   */
  private async validateRemitenteExists(remitenteId: number): Promise<void> {
    const remitente = await this.prisma.usuario.findFirst({
      where: {
        id_usuario: remitenteId,
      },
      select: {
        id_usuario: true,
        nombre: true,
      },
    });

    if (!remitente) {
      throw new BadRequestException(
        `Remitente con ID ${remitenteId} no encontrado`,
      );
    }
  }

  /**
   * Valida que no existe configuración previa para la empresa
   */
  private async validateConfiguracionNotExists(
    empresaId: number,
  ): Promise<void> {
    const configuracionExistente =
      await this.prisma.configuracionWhatsapp.findUnique({
        where: { id_empresa: empresaId },
        select: { id_empresa: true },
      });

    if (configuracionExistente) {
      throw new BadRequestException(
        `Ya existe una configuración de WhatsApp para la empresa ${empresaId}`,
      );
    }
  }

  /**
   * Valida tipo de consulta
   */
  private validateTipoConsulta(tipo: TipoConsulta): void {
    const tiposValidos = Object.values(TipoConsulta);
    if (!tiposValidos.includes(tipo)) {
      throw new BadRequestException(
        `Tipo de consulta inválido. Valores permitidos: ${tiposValidos.join(', ')}`,
      );
    }
  }

  /**
   * Valida estado de consulta
   */
  private validateEstadoConsulta(estado?: EstadoConsulta): void {
    if (estado) {
      const estadosValidos = Object.values(EstadoConsulta);
      if (!estadosValidos.includes(estado)) {
        throw new BadRequestException(
          `Estado de consulta inválido. Valores permitidos: ${estadosValidos.join(', ')}`,
        );
      }
    }
  }

  /**
   * Valida mensaje original no esté vacío
   */
  private validateMensajeOriginal(mensaje: string): void {
    if (!mensaje || mensaje.trim().length === 0) {
      throw new BadRequestException('El mensaje original no puede estar vacío');
    }

    if (mensaje.length > 4000) {
      throw new BadRequestException(
        'El mensaje original no puede exceder 4000 caracteres',
      );
    }
  }

  /**
   * Valida contenido del mensaje
   */
  private validateMensajeContent(contenido: string): void {
    if (!contenido || contenido.trim().length === 0) {
      throw new BadRequestException(
        'El contenido del mensaje no puede estar vacío',
      );
    }

    if (contenido.length > 4000) {
      throw new BadRequestException(
        'El contenido del mensaje no puede exceder 4000 caracteres',
      );
    }
  }

  /**
   * Valida tipo de mensaje
   */
  private validateTipoMensaje(tipo: string): void {
    const tiposValidos = [
      'texto',
      'imagen',
      'documento',
      'audio',
      'video',
      'ubicacion',
    ];
    if (!tiposValidos.includes(tipo)) {
      throw new BadRequestException(
        `Tipo de mensaje inválido. Valores permitidos: ${tiposValidos.join(', ')}`,
      );
    }
  }

  /**
   * Valida token de Evolution API
   */
  private validateEvolutionApiToken(token: string): void {
    if (!token || token.trim().length === 0) {
      throw new BadRequestException('El token de Evolution API es requerido');
    }

    if (token.length < 10) {
      throw new BadRequestException(
        'El token de Evolution API debe tener al menos 10 caracteres',
      );
    }
  }

  /**
   * Valida URL de webhook
   */
  private validateWebhookUrl(url?: string): void {
    if (url) {
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(url)) {
        throw new BadRequestException(
          'La URL del webhook debe ser una URL válida (http/https)',
        );
      }
    }
  }

  /**
   * Valida horario de atención
   */
  private validateHorarioAtencion(inicio?: string, fin?: string): void {
    if (inicio && fin) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (!timeRegex.test(inicio)) {
        throw new BadRequestException(
          'Horario de inicio inválido. Formato: HH:MM',
        );
      }

      if (!timeRegex.test(fin)) {
        throw new BadRequestException(
          'Horario de fin inválido. Formato: HH:MM',
        );
      }

      const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
      const [horaFin, minutoFin] = fin.split(':').map(Number);

      const minutosInicio = horaInicio * 60 + minutoInicio;
      const minutosFin = horaFin * 60 + minutoFin;

      if (minutosInicio >= minutosFin) {
        throw new BadRequestException(
          'El horario de inicio debe ser anterior al horario de fin',
        );
      }
    }
  }

  /**
   * Valida mensajes automáticos
   */
  private validateMensajesAutomaticos(
    dto: CreateConfiguracionWhatsappDto,
  ): void {
    if (dto.mensaje_bienvenida && dto.mensaje_bienvenida.length > 1000) {
      throw new BadRequestException(
        'El mensaje de bienvenida no puede exceder 1000 caracteres',
      );
    }

    if (dto.mensaje_ausencia && dto.mensaje_ausencia.length > 1000) {
      throw new BadRequestException(
        'El mensaje de ausencia no puede exceder 1000 caracteres',
      );
    }

    if (dto.mensaje_despedida && dto.mensaje_despedida.length > 1000) {
      throw new BadRequestException(
        'El mensaje de despedida no puede exceder 1000 caracteres',
      );
    }
  }
}
