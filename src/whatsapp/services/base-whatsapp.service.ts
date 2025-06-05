import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappValidationService } from './whatsapp-validation.service';
import { WhatsappCalculationService } from './whatsapp-calculation.service';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

/**
 * Servicio base para WhatsApp usando Template Method Pattern
 * Principio: Template Method - Define el esqueleto de algoritmos
 * Contexto: Operaciones base para el mercado peruano
 */
@Injectable()
export class BaseWhatsappService {
  protected readonly logger = new Logger(BaseWhatsappService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: WhatsappValidationService,
    protected readonly calculationService: WhatsappCalculationService,
  ) {}

  /**
   * Template Method para crear una consulta de WhatsApp
   * Define los pasos comunes para todas las implementaciones
   */
  protected async createConsultaTemplate<T>(
    createDto: any,
    additionalValidations?: () => Promise<void>,
    customProcessing?: (data: any) => any,
  ): Promise<T> {
    this.logger.log('Iniciando creación de consulta WhatsApp');

    // Paso 1: Validaciones básicas
    await this.validationService.validateConsultaCreation(createDto);

    // Paso 2: Validaciones adicionales específicas (hook)
    if (additionalValidations) {
      await additionalValidations();
    }

    // Paso 3: Preparar datos base
    const baseData = this.prepareConsultaBaseData(createDto);

    // Paso 4: Procesamiento personalizado (hook)
    const finalData = customProcessing ? customProcessing(baseData) : baseData;

    // Paso 5: Crear en base de datos
    const consulta = await this.executeConsultaCreation(finalData);

    // Paso 6: Post-procesamiento
    await this.postProcessConsultaCreation(consulta);

    this.logger.log(
      `Consulta WhatsApp creada exitosamente: ${consulta.id_consulta}`,
    );
    return consulta as T;
  }

  /**
   * Template Method para crear un mensaje de WhatsApp
   */
  protected async createMensajeTemplate<T>(
    createDto: any,
    additionalValidations?: () => Promise<void>,
    customProcessing?: (data: any) => any,
  ): Promise<T> {
    this.logger.log('Iniciando creación de mensaje WhatsApp');

    // Paso 1: Validaciones básicas
    await this.validationService.validateMensajeCreation(createDto);

    // Paso 2: Validaciones adicionales específicas (hook)
    if (additionalValidations) {
      await additionalValidations();
    }

    // Paso 3: Preparar datos base
    const baseData = this.prepareMensajeBaseData(createDto);

    // Paso 4: Procesamiento personalizado (hook)
    const finalData = customProcessing ? customProcessing(baseData) : baseData;

    // Paso 5: Crear en base de datos
    const mensaje = await this.executeMensajeCreation(finalData);

    // Paso 6: Post-procesamiento
    await this.postProcessMensajeCreation(mensaje);

    this.logger.log(
      `Mensaje WhatsApp creado exitosamente: ${mensaje.id_mensaje}`,
    );
    return mensaje as T;
  }

  /**
   * Template Method para obtener consultas con filtros
   */
  protected async findConsultasTemplate<T>(
    filters: any,
    pagination: { page: number; limit: number },
    customIncludes?: any,
    customWhere?: any,
  ): Promise<{ data: T[]; meta: any }> {
    this.logger.log('Obteniendo consultas WhatsApp con filtros');

    // Paso 1: Preparar filtros base
    const baseWhere = this.prepareConsultasBaseWhere(filters);

    // Paso 2: Combinar con filtros personalizados
    const finalWhere = customWhere
      ? { ...baseWhere, ...customWhere }
      : baseWhere;

    // Paso 3: Preparar includes base
    const baseIncludes = this.prepareConsultasBaseIncludes();

    // Paso 4: Combinar con includes personalizados
    const finalIncludes = customIncludes
      ? { ...baseIncludes, ...customIncludes }
      : baseIncludes;

    // Paso 5: Ejecutar consulta
    const result = await this.executeConsultasFind(
      finalWhere,
      finalIncludes,
      pagination,
    );

    this.logger.log(`Consultas obtenidas: ${result.data.length}`);
    return result;
  }

  /**
   * Template Method para actualizar consulta
   */
  protected async updateConsultaTemplate<T>(
    id: number,
    updateDto: any,
    additionalValidations?: () => Promise<void>,
    customProcessing?: (data: any) => any,
  ): Promise<T> {
    this.logger.log(`Actualizando consulta WhatsApp: ${id}`);

    // Paso 1: Verificar que existe
    await this.verifyConsultaExists(id);

    // Paso 2: Validaciones adicionales específicas (hook)
    if (additionalValidations) {
      await additionalValidations();
    }

    // Paso 3: Preparar datos de actualización
    const baseData = this.prepareConsultaUpdateData(updateDto);

    // Paso 4: Procesamiento personalizado (hook)
    const finalData = customProcessing ? customProcessing(baseData) : baseData;

    // Paso 5: Ejecutar actualización
    const consulta = await this.executeConsultaUpdate(id, finalData);

    // Paso 6: Post-procesamiento
    await this.postProcessConsultaUpdate(consulta);

    this.logger.log(`Consulta WhatsApp actualizada exitosamente: ${id}`);
    return consulta as T;
  }

  /**
   * Prepara datos base para crear consulta
   */
  protected prepareConsultaBaseData(createDto: any): any {
    return {
      id_empresa: createDto.id_empresa,
      id_cliente: createDto.id_cliente,
      numero_telefono: createDto.numero_telefono,
      nombre_contacto: createDto.nombre_contacto,
      tipo_consulta: createDto.tipo_consulta,
      estado_consulta: createDto.estado_consulta || EstadoConsulta.NUEVA,
      mensaje_original: createDto.mensaje_original,
      respuesta_automatica: createDto.respuesta_automatica,
      procesado_por_ia: createDto.procesado_por_ia || false,
      requiere_atencion: createDto.requiere_atencion || true,
      tiempo_respuesta: createDto.tiempo_respuesta,
      satisfaccion: createDto.satisfaccion,
      notas_internas: createDto.notas_internas,
      id_cotizacion: createDto.id_cotizacion,
      fecha_consulta: new Date(),
    };
  }

  /**
   * Prepara datos base para crear mensaje
   */
  protected prepareMensajeBaseData(createDto: any): any {
    return {
      id_consulta: createDto.id_consulta,
      mensaje: createDto.mensaje,
      tipo_mensaje: createDto.tipo_mensaje || 'text',
      es_entrante: createDto.es_entrante || false,
      url_archivo: createDto.url_archivo,
      nombre_archivo: createDto.nombre_archivo,
      tamanio_archivo: createDto.tamanio_archivo,
      procesado: createDto.procesado || false,
      mensaje_id_wa: createDto.mensaje_id_wa,
      estado_entrega: createDto.estado_entrega,
      fecha_mensaje: new Date(),
    };
  }

  /**
   * Prepara filtros base para consultas
   */
  protected prepareConsultasBaseWhere(filters: any): any {
    const where: any = {};

    if (filters.empresaId) where.id_empresa = filters.empresaId;
    if (filters.estado) where.estado_consulta = filters.estado;
    if (filters.tipo) where.tipo_consulta = filters.tipo;
    if (filters.clienteId) where.id_cliente = filters.clienteId;
    if (filters.fechaInicio && filters.fechaFin) {
      where.fecha_consulta = {
        gte: new Date(filters.fechaInicio),
        lte: new Date(filters.fechaFin),
      };
    }

    return where;
  }

  /**
   * Prepara includes base para consultas
   */
  protected prepareConsultasBaseIncludes(): any {
    return {
      empresa: {
        select: {
          id_empresa: true,
          nombre: true,
          telefono: true,
        },
      },
      cliente: {
        select: {
          id_cliente: true,
          nombre: true,
          email: true,
          telefono: true,
        },
      },
      cotizacion: {
        select: {
          id_cotizacion: true,
          total: true,
          estado: true,
          fecha_emision: true,
        },
      },
    };
  }

  /**
   * Prepara datos de actualización para consulta
   */
  protected prepareConsultaUpdateData(updateDto: any): any {
    const data: any = { ...updateDto };

    // Agregar fecha de respuesta si se está marcando como respondida
    if (updateDto.estado_consulta === EstadoConsulta.RESPONDIDA) {
      data.fecha_respuesta = new Date();
    }

    return data;
  }

  /**
   * Ejecuta la creación de consulta en base de datos
   */
  protected async executeConsultaCreation(data: any): Promise<any> {
    return await this.prisma.consultaWhatsapp.create({
      data,
      include: this.prepareConsultasBaseIncludes(),
    });
  }

  /**
   * Ejecuta la creación de mensaje en base de datos
   */
  protected async executeMensajeCreation(data: any): Promise<any> {
    return await this.prisma.mensajeWhatsapp.create({
      data,
      include: {
        consulta: {
          select: {
            id_consulta: true,
            numero_telefono: true,
            nombre_contacto: true,
          },
        },
      },
    });
  }

  /**
   * Ejecuta la búsqueda de consultas
   */
  protected async executeConsultasFind(
    where: any,
    includes: any,
    pagination: { page: number; limit: number },
  ): Promise<{ data: any[]; meta: any }> {
    const skip = (pagination.page - 1) * pagination.limit;

    const [consultas, total] = await Promise.all([
      this.prisma.consultaWhatsapp.findMany({
        skip,
        take: pagination.limit,
        where,
        include: {
          ...includes,
          mensajes: {
            orderBy: { fecha_mensaje: 'desc' },
            take: 1,
          },
        },
        orderBy: {
          fecha_consulta: 'desc',
        },
      }),
      this.prisma.consultaWhatsapp.count({ where }),
    ]);

    return {
      data: consultas,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Ejecuta la actualización de consulta
   */
  protected async executeConsultaUpdate(id: number, data: any): Promise<any> {
    return await this.prisma.consultaWhatsapp.update({
      where: { id_consulta: id },
      data,
      include: this.prepareConsultasBaseIncludes(),
    });
  }

  /**
   * Verifica que una consulta existe
   */
  protected async verifyConsultaExists(id: number): Promise<void> {
    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: id },
      select: { id_consulta: true },
    });

    if (!consulta) {
      throw new NotFoundException(`Consulta con ID ${id} no encontrada`);
    }
  }

  /**
   * Post-procesamiento después de crear consulta
   * Hook para implementaciones específicas
   */
  protected async postProcessConsultaCreation(consulta: any): Promise<void> {
    // Calcular tiempo de respuesta si es necesario
    if (consulta.estado_consulta === EstadoConsulta.RESPONDIDA) {
      const tiempoRespuesta =
        await this.calculationService.calculateTiempoRespuestaConsulta(
          consulta.id_consulta,
        );

      if (tiempoRespuesta !== null) {
        await this.prisma.consultaWhatsapp.update({
          where: { id_consulta: consulta.id_consulta },
          data: { tiempo_respuesta: tiempoRespuesta },
        });
      }
    }
  }

  /**
   * Post-procesamiento después de crear mensaje
   * Hook para implementaciones específicas
   */
  protected async postProcessMensajeCreation(mensaje: any): Promise<void> {
    // Actualizar tiempo de respuesta de la consulta si es mensaje saliente
    if (!mensaje.es_entrante) {
      const tiempoRespuesta =
        await this.calculationService.calculateTiempoRespuestaConsulta(
          mensaje.id_consulta,
        );

      if (tiempoRespuesta !== null) {
        await this.prisma.consultaWhatsapp.update({
          where: { id_consulta: mensaje.id_consulta },
          data: {
            tiempo_respuesta: tiempoRespuesta,
            fecha_respuesta: new Date(),
            estado_consulta: EstadoConsulta.RESPONDIDA,
          },
        });
      }
    }
  }

  /**
   * Post-procesamiento después de actualizar consulta
   * Hook para implementaciones específicas
   */
  protected async postProcessConsultaUpdate(consulta: any): Promise<void> {
    // Recalcular tiempo de respuesta si es necesario
    if (
      consulta.estado_consulta === EstadoConsulta.RESPONDIDA &&
      !consulta.tiempo_respuesta
    ) {
      const tiempoRespuesta =
        await this.calculationService.calculateTiempoRespuestaConsulta(
          consulta.id_consulta,
        );

      if (tiempoRespuesta !== null) {
        await this.prisma.consultaWhatsapp.update({
          where: { id_consulta: consulta.id_consulta },
          data: { tiempo_respuesta: tiempoRespuesta },
        });
      }
    }
  }

  /**
   * Método para formatear respuesta específica del contexto peruano
   * Puede ser sobrescrito por servicios específicos
   */
  protected formatPeruvianResponse(data: any): any {
    return data;
  }

  /**
   * Método para aplicar reglas de negocio específicas
   * Puede ser sobrescrito por servicios específicos
   */
  protected async applyBusinessRules(data: any): Promise<any> {
    return data;
  }
}
