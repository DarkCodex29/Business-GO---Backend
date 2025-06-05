import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmailService } from './email.service';
import {
  SendEmailDto,
  CreatePlantillaDto,
  UpdatePlantillaDto,
  PaginationDto,
  TipoEmail as TipoEmailDto,
} from './dto';
import {
  EmailFormatted,
  PlantillaFormatted,
  EmailResponse,
  PaginatedEmailResponse,
  PaginatedPlantillaResponse,
  MetricasEmail,
  EstadisticasEmail,
  TendenciaEmail,
  AnalisisRendimiento,
  ReporteDetallado,
  TipoEmail,
  PrioridadEmail,
  EstadoEmail,
  PlantillaResponse,
} from './services/base-email.service';

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ==================== ENDPOINTS DE ENVÍO ====================

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar email',
    description:
      'Envía un email individual o masivo con opciones avanzadas de personalización',
  })
  @ApiResponse({
    status: 200,
    description: 'Email enviado exitosamente',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 429, description: 'Límite de envío excedido' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendEmail(
    @Body() sendEmailDto: SendEmailDto,
    @Request() req: any,
  ): Promise<EmailResponse> {
    const empresaId = req.user.empresa_id;
    const usuarioId = req.user.id;
    return this.emailService.sendEmail(sendEmailDto, empresaId, usuarioId);
  }

  @Post('send-with-template/:templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar email con plantilla',
    description: 'Envía un email utilizando una plantilla predefinida',
  })
  @ApiResponse({
    status: 200,
    description: 'Email con plantilla enviado exitosamente',
  })
  async sendEmailWithTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body()
    body: {
      to: string[];
      variables: Record<string, any>;
      cc?: string[];
      bcc?: string[];
      prioridad?: PrioridadEmail;
      fecha_programada?: Date;
    },
    @Request() req: any,
  ): Promise<EmailResponse> {
    const empresaId = req.user.empresa_id;
    return this.emailService.sendEmailWithTemplate(
      templateId,
      body.to,
      body.variables,
      empresaId,
      {
        cc: body.cc,
        bcc: body.bcc,
        prioridad: body.prioridad,
        fecha_programada: body.fecha_programada,
      },
    );
  }

  // ==================== ENDPOINTS DE COMPATIBILIDAD ====================

  @Post('send-welcome')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar email de bienvenida',
    description: 'Envía un email de bienvenida personalizado',
  })
  async sendWelcomeEmail(
    @Body() body: { email: string; name: string },
    @Request() req: any,
  ): Promise<EmailResponse> {
    const empresaId = req.user.empresa_id;
    return this.emailService.sendWelcomeEmail(
      body.email,
      { nombre: body.name },
      empresaId,
    );
  }

  @Post('send-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar email de recuperación de contraseña',
    description: 'Envía un email con enlace para restablecer contraseña',
  })
  async sendPasswordResetEmail(
    @Body() body: { email: string; resetToken: string },
    @Request() req: any,
  ): Promise<EmailResponse> {
    const empresaId = req.user.empresa_id;
    return this.emailService.sendPasswordResetEmail(
      body.email,
      body.resetToken,
      empresaId,
    );
  }

  @Post('send-appointment-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar confirmación de cita',
    description: 'Envía un email de confirmación de cita con detalles',
  })
  async sendAppointmentConfirmation(
    @Body() body: { email: string; appointmentDetails: any },
    @Request() req: any,
  ): Promise<EmailResponse> {
    const empresaId = req.user.empresa_id;
    return this.emailService.sendAppointmentConfirmation(
      body.email,
      body.appointmentDetails,
      empresaId,
    );
  }

  // ==================== ENDPOINTS DE GESTIÓN DE EMAILS ====================

  @Get()
  @ApiOperation({
    summary: 'Obtener emails',
    description: 'Obtiene una lista paginada de emails con filtros opcionales',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoEmail,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoEmail,
    description: 'Filtrar por tipo',
  })
  @ApiQuery({
    name: 'fecha_desde',
    required: false,
    type: String,
    description: 'Fecha desde (ISO)',
  })
  @ApiQuery({
    name: 'fecha_hasta',
    required: false,
    type: String,
    description: 'Fecha hasta (ISO)',
  })
  @ApiQuery({
    name: 'destinatario',
    required: false,
    type: String,
    description: 'Filtrar por destinatario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de emails obtenida exitosamente',
  })
  async getEmails(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('tipo') tipo?: string,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ): Promise<PaginatedEmailResponse> {
    const empresaId = req.user.empresa_id;

    const filters = {
      tipo: tipo as TipoEmailDto,
      estado: estado as any,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    };

    return this.emailService.getEmails(empresaId, page, limit, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener email por ID',
    description: 'Obtiene los detalles de un email específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Email encontrado',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Email no encontrado' })
  async getEmailById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<EmailFormatted> {
    const empresaId = req.user.empresa_id;
    // Implementar método específico en el servicio si es necesario
    const emails = await this.emailService.getEmails(empresaId, 1, 1);

    if (emails.data.length === 0) {
      throw new Error('Email no encontrado');
    }

    return emails.data[0];
  }

  // ==================== ENDPOINTS DE PLANTILLAS ====================

  @Post('plantillas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear plantilla de email',
    description: 'Crea una nueva plantilla de email reutilizable',
  })
  @ApiResponse({
    status: 201,
    description: 'Plantilla creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos de plantilla inválidos' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPlantilla(
    @Body() createPlantillaDto: CreatePlantillaDto,
    @Request() req: any,
  ): Promise<PlantillaResponse> {
    const empresaId = req.user.empresa_id;
    const usuarioId = req.user.id;
    return this.emailService.createPlantilla(
      createPlantillaDto,
      empresaId,
      usuarioId,
    );
  }

  @Get('plantillas')
  @ApiOperation({
    summary: 'Obtener plantillas',
    description: 'Obtiene una lista paginada de plantillas de email',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'categoria',
    required: false,
    type: String,
    description: 'Filtrar por categoría',
  })
  @ApiQuery({
    name: 'tipo_email',
    required: false,
    enum: TipoEmail,
    description: 'Filtrar por tipo',
  })
  @ApiQuery({
    name: 'activa',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiQuery({
    name: 'buscar',
    required: false,
    type: String,
    description: 'Buscar en nombre y descripción',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de plantillas obtenida exitosamente',
  })
  async getPlantillas(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('tipo_email') tipoEmail?: string,
    @Query('activa') activa?: boolean,
  ): Promise<PaginatedPlantillaResponse> {
    const empresaId = req.user.empresa_id;

    const filters = {
      tipo_email: tipoEmail as TipoEmailDto,
      activa,
    };

    return this.emailService.getPlantillas(empresaId, page, limit, filters);
  }

  @Get('plantillas/:id')
  @ApiOperation({
    summary: 'Obtener plantilla por ID',
    description: 'Obtiene los detalles de una plantilla específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla encontrada',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async getPlantillaById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<PlantillaResponse> {
    const empresaId = req.user.empresa_id;
    const plantilla = await this.emailService.getPlantillaById(id, empresaId);

    if (!plantilla) {
      throw new Error('Plantilla no encontrada');
    }

    return plantilla;
  }

  @Put('plantillas/:id')
  @ApiOperation({
    summary: 'Actualizar plantilla',
    description: 'Actualiza una plantilla de email existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePlantilla(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlantillaDto: UpdatePlantillaDto,
    @Request() req: any,
  ): Promise<PlantillaResponse> {
    const empresaId = req.user.empresa_id;
    const usuarioId = req.user.id;
    return this.emailService.updatePlantilla(
      id,
      updatePlantillaDto,
      empresaId,
      usuarioId,
    );
  }

  @Delete('plantillas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar plantilla',
    description: 'Elimina una plantilla de email',
  })
  @ApiResponse({
    status: 204,
    description: 'Plantilla eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async deletePlantilla(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    const empresaId = req.user.empresa_id;
    const usuarioId = req.user.id;
    return this.emailService.deletePlantilla(id, empresaId, usuarioId);
  }

  // ==================== ENDPOINTS DE MÉTRICAS Y ESTADÍSTICAS ====================

  @Get('metricas/generales')
  @ApiOperation({
    summary: 'Obtener métricas generales',
    description: 'Obtiene métricas generales de email marketing',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente',
  })
  async getMetricasGenerales(@Request() req: any): Promise<MetricasEmail> {
    const empresaId = req.user.empresa_id;
    return this.emailService.getMetricasGenerales(empresaId);
  }

  @Get('estadisticas')
  @ApiOperation({
    summary: 'Obtener estadísticas detalladas',
    description:
      'Obtiene estadísticas detalladas con distribuciones temporales',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  async getEstadisticasEmail(@Request() req: any): Promise<EstadisticasEmail> {
    const empresaId = req.user.empresa_id;
    return this.emailService.getEstadisticasEmail(empresaId);
  }

  @Get('tendencia')
  @ApiOperation({
    summary: 'Obtener tendencias de email',
    description: 'Obtiene análisis de tendencias para un período específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencias obtenidas exitosamente',
  })
  async getTendenciaEmail(
    @Request() req: any,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ): Promise<TendenciaEmail> {
    const empresaId = req.user.empresa_id;

    const inicio = fechaInicio
      ? new Date(fechaInicio)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    return this.emailService.getTendenciaEmail(empresaId, inicio, fin);
  }

  @Get('analisis/rendimiento')
  @ApiOperation({
    summary: 'Obtener análisis de rendimiento',
    description:
      'Obtiene análisis detallado de rendimiento con recomendaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis obtenido exitosamente',
  })
  async getAnalisisRendimiento(
    @Request() req: any,
  ): Promise<AnalisisRendimiento> {
    const empresaId = req.user.empresa_id;
    return this.emailService.getAnalisisRendimiento(empresaId);
  }

  @Get('reporte/detallado')
  @ApiOperation({
    summary: 'Obtener reporte detallado',
    description:
      'Obtiene un reporte completo con métricas, tendencias y recomendaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte obtenido exitosamente',
  })
  async getReporteDetallado(
    @Request() req: any,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ): Promise<ReporteDetallado> {
    const empresaId = req.user.empresa_id;

    const inicio = fechaInicio
      ? new Date(fechaInicio)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    return this.emailService.getReporteDetallado(empresaId, inicio, fin);
  }

  // ==================== ENDPOINTS DE UTILIDADES ====================

  @Get('plantillas/:id/preview')
  @ApiOperation({
    summary: 'Vista previa de plantilla',
    description:
      'Genera una vista previa de la plantilla con variables de ejemplo',
  })
  @ApiResponse({
    status: 200,
    description: 'Vista previa generada exitosamente',
  })
  async previewPlantilla(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('variables') variables: string,
    @Request() req: any,
  ): Promise<{ html: string; texto: string; asunto: string }> {
    const empresaId = req.user.empresa_id;
    const plantilla = await this.emailService.getPlantillaById(id, empresaId);

    if (!plantilla) {
      throw new Error('Plantilla no encontrada');
    }

    let parsedVariables = {};
    if (variables) {
      try {
        parsedVariables = JSON.parse(variables);
      } catch (error) {
        throw new Error('Variables inválidas. Debe ser un JSON válido.');
      }
    }

    // Procesar plantilla con variables
    const htmlProcessed = this.processTemplate(
      plantilla.contenido_html,
      parsedVariables,
    );
    const textoProcessed = this.processTemplate(
      plantilla.contenido_texto || '',
      parsedVariables,
    );
    const asuntoProcessed = this.processTemplate(
      plantilla.asunto,
      parsedVariables,
    );

    return {
      html: htmlProcessed,
      texto: textoProcessed,
      asunto: asuntoProcessed,
    };
  }

  // Método auxiliar para procesar plantillas
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

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Probar conexión de email',
    description:
      'Prueba la conexión del servicio de email (solo administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Conexión probada exitosamente',
  })
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Enviar un email de prueba simple
      const testResult = await this.emailService['executeEmailSend'](
        {
          to: 'test@businessgo.com',
          subject: 'Test de Conexión - BusinessGo',
          htmlContent: '<p>Este es un email de prueba de conexión.</p>',
          textContent: 'Este es un email de prueba de conexión.',
        },
        'test-empresa',
      );

      return {
        success: true,
        message: 'Conexión exitosa',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error de conexión: ${error.message}`,
      };
    }
  }

  @Get('estadisticas/resumen')
  @ApiOperation({
    summary: 'Resumen de estadísticas',
    description:
      'Obtiene un resumen rápido de las estadísticas más importantes',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen obtenido exitosamente',
  })
  async getResumenEstadisticas(@Request() req: any): Promise<{
    emails_enviados_hoy: number;
    emails_enviados_mes: number;
    tasa_apertura_promedio: number;
    tasa_clic_promedio: number;
    plantillas_activas: number;
    emails_programados: number;
  }> {
    const empresaId = req.user.empresa_id;

    const [metricas, estadisticas] = await Promise.all([
      this.emailService.getMetricasGenerales(empresaId),
      this.emailService.getEstadisticasEmail(empresaId),
    ]);

    const plantillasActivas = await this.emailService.getPlantillas(
      empresaId,
      1,
      1,
      { activa: true },
    );

    return {
      emails_enviados_hoy: estadisticas.emails_hoy || 0,
      emails_enviados_mes: estadisticas.emails_este_mes || 0,
      tasa_apertura_promedio: metricas.tasa_apertura,
      tasa_clic_promedio: metricas.tasa_clics,
      plantillas_activas: plantillasActivas.pagination.total,
      emails_programados: 0, // Placeholder
    };
  }
}
