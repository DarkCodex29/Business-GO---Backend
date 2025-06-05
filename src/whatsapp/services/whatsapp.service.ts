import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultaWhatsappDto } from '../dto/create-consulta-whatsapp.dto';
import { UpdateConsultaWhatsappDto } from '../dto/update-consulta-whatsapp.dto';
import { CreateMensajeWhatsappDto } from '../dto/create-mensaje-whatsapp.dto';
import { CreateConfiguracionWhatsappDto } from '../dto/create-configuracion-whatsapp.dto';
import { UpdateConfiguracionWhatsappDto } from '../dto/update-configuracion-whatsapp.dto';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // GESTIÓN DE CONSULTAS
  // ========================================

  async createConsulta(createConsultaDto: CreateConsultaWhatsappDto) {
    try {
      return await this.prisma.consultaWhatsapp.create({
        data: {
          id_empresa: createConsultaDto.id_empresa,
          id_cliente: createConsultaDto.id_cliente,
          numero_telefono: createConsultaDto.numero_telefono,
          nombre_contacto: createConsultaDto.nombre_contacto,
          tipo_consulta: createConsultaDto.tipo_consulta,
          estado_consulta:
            createConsultaDto.estado_consulta || EstadoConsulta.NUEVA,
          mensaje_original: createConsultaDto.mensaje_original,
          respuesta_automatica: createConsultaDto.respuesta_automatica,
          procesado_por_ia: createConsultaDto.procesado_por_ia || false,
          requiere_atencion: createConsultaDto.requiere_atencion || true,
          tiempo_respuesta: createConsultaDto.tiempo_respuesta,
          satisfaccion: createConsultaDto.satisfaccion,
          notas_internas: createConsultaDto.notas_internas,
          id_cotizacion: createConsultaDto.id_cotizacion,
        },
        include: {
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
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear consulta WhatsApp: ${error.message}`);
      throw error;
    }
  }

  async findAllConsultas(
    empresaId?: number,
    page = 1,
    limit = 10,
    estado?: EstadoConsulta,
    tipo?: TipoConsulta,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (empresaId) where.id_empresa = empresaId;
    if (estado) where.estado_consulta = estado;
    if (tipo) where.tipo_consulta = tipo;

    const [consultas, total] = await Promise.all([
      this.prisma.consultaWhatsapp.findMany({
        skip,
        take: limit,
        where,
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
            },
          },
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              telefono: true,
            },
          },
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
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneConsulta(id: number) {
    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: id },
      include: {
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
        mensajes: {
          orderBy: { fecha_mensaje: 'asc' },
        },
        cotizacion: {
          select: {
            id_cotizacion: true,
            total: true,
            estado: true,
            fecha_emision: true,
          },
        },
      },
    });

    if (!consulta) {
      throw new NotFoundException(`Consulta con ID ${id} no encontrada`);
    }

    return consulta;
  }

  async updateConsulta(
    id: number,
    updateConsultaDto: UpdateConsultaWhatsappDto,
  ) {
    try {
      return await this.prisma.consultaWhatsapp.update({
        where: { id_consulta: id },
        data: {
          ...updateConsultaDto,
          fecha_respuesta:
            updateConsultaDto.estado_consulta === EstadoConsulta.RESPONDIDA
              ? new Date()
              : undefined,
        },
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
            },
          },
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              telefono: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Consulta con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  async cerrarConsulta(id: number, satisfaccion?: number, notas?: string) {
    return this.updateConsulta(id, {
      estado_consulta: EstadoConsulta.CERRADA,
      satisfaccion,
      notas_internas: notas,
    });
  }

  // ========================================
  // GESTIÓN DE MENSAJES
  // ========================================

  async createMensaje(createMensajeDto: CreateMensajeWhatsappDto) {
    try {
      const mensaje = await this.prisma.mensajeWhatsapp.create({
        data: {
          id_consulta: createMensajeDto.id_consulta,
          mensaje: createMensajeDto.mensaje,
          es_entrante: createMensajeDto.es_entrante,
          tipo_mensaje: createMensajeDto.tipo_mensaje || 'text',
          url_archivo: createMensajeDto.url_archivo,
          nombre_archivo: createMensajeDto.nombre_archivo,
          tamanio_archivo: createMensajeDto.tamanio_archivo,
          procesado: createMensajeDto.procesado || false,
          mensaje_id_wa: createMensajeDto.mensaje_id_wa,
          estado_entrega: createMensajeDto.estado_entrega,
        },
        include: {
          consulta: {
            select: {
              id_consulta: true,
              numero_telefono: true,
              nombre_contacto: true,
              empresa: {
                select: {
                  id_empresa: true,
                  nombre: true,
                },
              },
            },
          },
        },
      });

      // Actualizar tiempo de respuesta si es mensaje saliente
      if (!createMensajeDto.es_entrante) {
        await this.actualizarTiempoRespuesta(createMensajeDto.id_consulta);
      }

      return mensaje;
    } catch (error) {
      this.logger.error(`Error al crear mensaje WhatsApp: ${error.message}`);
      throw error;
    }
  }

  async findMensajesByConsulta(consultaId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [mensajes, total] = await Promise.all([
      this.prisma.mensajeWhatsapp.findMany({
        skip,
        take: limit,
        where: { id_consulta: consultaId },
        orderBy: { fecha_mensaje: 'asc' },
      }),
      this.prisma.mensajeWhatsapp.count({
        where: { id_consulta: consultaId },
      }),
    ]);

    return {
      data: mensajes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async actualizarTiempoRespuesta(consultaId: number) {
    const consulta = await this.prisma.consultaWhatsapp.findUnique({
      where: { id_consulta: consultaId },
      select: { fecha_consulta: true },
    });

    if (consulta) {
      const tiempoRespuesta = Math.floor(
        (new Date().getTime() - consulta.fecha_consulta.getTime()) /
          (1000 * 60),
      );

      await this.prisma.consultaWhatsapp.update({
        where: { id_consulta: consultaId },
        data: {
          tiempo_respuesta: tiempoRespuesta,
          estado_consulta: EstadoConsulta.RESPONDIDA,
          fecha_respuesta: new Date(),
        },
      });
    }
  }

  // ========================================
  // GESTIÓN DE CONFIGURACIÓN
  // ========================================

  async createConfiguracion(createConfigDto: CreateConfiguracionWhatsappDto) {
    try {
      // Verificar que la empresa no tenga ya una configuración
      const configExistente =
        await this.prisma.configuracionWhatsapp.findUnique({
          where: { id_empresa: createConfigDto.id_empresa },
        });

      if (configExistente) {
        throw new BadRequestException(
          'La empresa ya tiene una configuración de WhatsApp',
        );
      }

      return await this.prisma.configuracionWhatsapp.create({
        data: {
          id_empresa: createConfigDto.id_empresa,
          numero_whatsapp: createConfigDto.numero_whatsapp,
          nombre_negocio: createConfigDto.nombre_negocio,
          mensaje_bienvenida:
            createConfigDto.mensaje_bienvenida ||
            '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?',
          mensaje_ausencia: createConfigDto.mensaje_ausencia,
          mensaje_despedida: createConfigDto.mensaje_despedida,
          horario_atencion: createConfigDto.horario_atencion,
          respuestas_automaticas:
            createConfigDto.respuestas_automaticas ?? true,
          ia_habilitada: createConfigDto.ia_habilitada ?? false,
          webhook_url: createConfigDto.webhook_url,
          token_api: createConfigDto.token_api,
          instancia_id: createConfigDto.instancia_id,
          activo: createConfigDto.activo ?? true,
        },
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
              ruc: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear configuración WhatsApp: ${error.message}`,
      );
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una configuración para esta empresa',
        );
      }
      throw error;
    }
  }

  async findConfiguracionByEmpresa(empresaId: number) {
    const configuracion = await this.prisma.configuracionWhatsapp.findUnique({
      where: { id_empresa: empresaId },
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
            ruc: true,
          },
        },
      },
    });

    if (!configuracion) {
      throw new NotFoundException(
        `No se encontró configuración de WhatsApp para la empresa ${empresaId}`,
      );
    }

    return configuracion;
  }

  async updateConfiguracion(
    empresaId: number,
    updateConfigDto: UpdateConfiguracionWhatsappDto,
  ) {
    try {
      return await this.prisma.configuracionWhatsapp.update({
        where: { id_empresa: empresaId },
        data: updateConfigDto,
        include: {
          empresa: {
            select: {
              id_empresa: true,
              nombre: true,
              ruc: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Configuración de WhatsApp para empresa ${empresaId} no encontrada`,
        );
      }
      throw error;
    }
  }

  // ========================================
  // MÉTRICAS Y ANALYTICS
  // ========================================

  async getMetricasDiarias(empresaId: number, fecha?: Date) {
    const fechaBusqueda = fecha || new Date();
    fechaBusqueda.setHours(0, 0, 0, 0);

    const metrica = await this.prisma.metricaWhatsapp.findFirst({
      where: {
        id_empresa: empresaId,
        fecha: fechaBusqueda,
      },
    });

    if (!metrica) {
      // Crear métrica del día si no existe
      return await this.prisma.metricaWhatsapp.create({
        data: {
          id_empresa: empresaId,
          fecha: fechaBusqueda,
        },
      });
    }

    return metrica;
  }

  async actualizarMetricas(empresaId: number, fecha: Date) {
    const fechaBusqueda = new Date(fecha);
    fechaBusqueda.setHours(0, 0, 0, 0);

    const fechaSiguiente = new Date(fechaBusqueda);
    fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);

    // Calcular métricas del día
    const [
      consultasRecibidas,
      consultasRespondidas,
      tiempoPromedioRespuesta,
      conversionesCotizacion,
      clientesNuevos,
      mensajesEnviados,
      mensajesRecibidos,
      satisfaccionPromedio,
    ] = await Promise.all([
      this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
        },
      }),
      this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          estado_consulta: EstadoConsulta.RESPONDIDA,
        },
      }),
      this.prisma.consultaWhatsapp.aggregate({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          tiempo_respuesta: { not: null },
        },
        _avg: { tiempo_respuesta: true },
      }),
      this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          id_cotizacion: { not: null },
        },
      }),
      this.prisma.consultaWhatsapp.count({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          id_cliente: null,
        },
      }),
      this.prisma.mensajeWhatsapp.count({
        where: {
          consulta: { id_empresa: empresaId },
          fecha_mensaje: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          es_entrante: false,
        },
      }),
      this.prisma.mensajeWhatsapp.count({
        where: {
          consulta: { id_empresa: empresaId },
          fecha_mensaje: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          es_entrante: true,
        },
      }),
      this.prisma.consultaWhatsapp.aggregate({
        where: {
          id_empresa: empresaId,
          fecha_consulta: {
            gte: fechaBusqueda,
            lt: fechaSiguiente,
          },
          satisfaccion: { not: null },
        },
        _avg: { satisfaccion: true },
      }),
    ]);

    // Buscar métrica existente
    const metricaExistente = await this.prisma.metricaWhatsapp.findFirst({
      where: {
        id_empresa: empresaId,
        fecha: fechaBusqueda,
      },
    });

    if (metricaExistente) {
      // Actualizar métrica existente
      return await this.prisma.metricaWhatsapp.update({
        where: { id_metrica: metricaExistente.id_metrica },
        data: {
          consultas_recibidas: consultasRecibidas,
          consultas_respondidas: consultasRespondidas,
          tiempo_respuesta_promedio: Math.round(
            tiempoPromedioRespuesta._avg.tiempo_respuesta || 0,
          ),
          conversiones_cotizacion: conversionesCotizacion,
          conversiones_venta: 0, // Por ahora en 0, se puede calcular después
          clientes_nuevos: clientesNuevos,
          mensajes_enviados: mensajesEnviados,
          mensajes_recibidos: mensajesRecibidos,
          satisfaccion_promedio: satisfaccionPromedio._avg.satisfaccion,
        },
      });
    } else {
      // Crear nueva métrica
      return await this.prisma.metricaWhatsapp.create({
        data: {
          id_empresa: empresaId,
          fecha: fechaBusqueda,
          consultas_recibidas: consultasRecibidas,
          consultas_respondidas: consultasRespondidas,
          tiempo_respuesta_promedio: Math.round(
            tiempoPromedioRespuesta._avg.tiempo_respuesta || 0,
          ),
          conversiones_cotizacion: conversionesCotizacion,
          conversiones_venta: 0, // Por ahora en 0, se puede calcular después
          clientes_nuevos: clientesNuevos,
          mensajes_enviados: mensajesEnviados,
          mensajes_recibidos: mensajesRecibidos,
          satisfaccion_promedio: satisfaccionPromedio._avg.satisfaccion,
        },
      });
    }
  }

  async getResumenMetricas(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    return await this.prisma.metricaWhatsapp.findMany({
      where: {
        id_empresa: empresaId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }
}
