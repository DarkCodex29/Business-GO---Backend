import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WhatsappService } from '../services/whatsapp.service';
import { CreateConsultaWhatsappDto } from '../dto/create-consulta-whatsapp.dto';
import { UpdateConsultaWhatsappDto } from '../dto/update-consulta-whatsapp.dto';
import { CreateMensajeWhatsappDto } from '../dto/create-mensaje-whatsapp.dto';
import { CreateConfiguracionWhatsappDto } from '../dto/create-configuracion-whatsapp.dto';
import { UpdateConfiguracionWhatsappDto } from '../dto/update-configuracion-whatsapp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { TipoConsulta, EstadoConsulta } from '../../common/enums/estados.enum';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // ========================================
  // ENDPOINTS PARA CONSULTAS
  // ========================================

  @Post('consultas')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Crear una nueva consulta de WhatsApp' })
  @ApiResponse({
    status: 201,
    description: 'La consulta ha sido creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createConsulta(@Body() createConsultaDto: CreateConsultaWhatsappDto) {
    return this.whatsappService.createConsulta(createConsultaDto);
  }

  @Get('consultas')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Obtener todas las consultas de WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'Lista de consultas obtenida exitosamente',
  })
  @ApiQuery({
    name: 'empresaId',
    required: false,
    description: 'ID de la empresa',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoConsulta,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoConsulta,
    description: 'Filtrar por tipo',
  })
  findAllConsultas(
    @Query('empresaId') empresaId?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('estado') estado?: EstadoConsulta,
    @Query('tipo') tipo?: TipoConsulta,
  ) {
    return this.whatsappService.findAllConsultas(
      empresaId ? +empresaId : undefined,
      +page,
      +limit,
      estado,
      tipo,
    );
  }

  @Get('consultas/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Obtener una consulta por ID' })
  @ApiResponse({
    status: 200,
    description: 'Consulta encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Consulta no encontrada' })
  findOneConsulta(@Param('id', ParseIntPipe) id: number) {
    return this.whatsappService.findOneConsulta(id);
  }

  @Patch('consultas/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Actualizar una consulta' })
  @ApiResponse({
    status: 200,
    description: 'Consulta actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Consulta no encontrada' })
  updateConsulta(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConsultaDto: UpdateConsultaWhatsappDto,
  ) {
    return this.whatsappService.updateConsulta(id, updateConsultaDto);
  }

  @Patch('consultas/:id/cerrar')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Cerrar una consulta' })
  @ApiResponse({
    status: 200,
    description: 'Consulta cerrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Consulta no encontrada' })
  cerrarConsulta(
    @Param('id', ParseIntPipe) id: number,
    @Body('satisfaccion') satisfaccion?: number,
    @Body('notas') notas?: string,
  ) {
    return this.whatsappService.cerrarConsulta(id, satisfaccion, notas);
  }

  // ========================================
  // ENDPOINTS PARA MENSAJES
  // ========================================

  @Post('mensajes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Crear un nuevo mensaje de WhatsApp' })
  @ApiResponse({
    status: 201,
    description: 'El mensaje ha sido creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createMensaje(@Body() createMensajeDto: CreateMensajeWhatsappDto) {
    return this.whatsappService.createMensaje(createMensajeDto);
  }

  @Get('consultas/:consultaId/mensajes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN, ROLES.VENDEDOR)
  @ApiOperation({ summary: 'Obtener mensajes de una consulta' })
  @ApiResponse({
    status: 200,
    description: 'Lista de mensajes obtenida exitosamente',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  findMensajesByConsulta(
    @Param('consultaId', ParseIntPipe) consultaId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.whatsappService.findMensajesByConsulta(
      consultaId,
      +page,
      +limit,
    );
  }

  // ========================================
  // ENDPOINTS PARA CONFIGURACIÓN
  // ========================================

  @Post('configuracion')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Crear configuración de WhatsApp para una empresa' })
  @ApiResponse({
    status: 201,
    description: 'La configuración ha sido creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createConfiguracion(@Body() createConfigDto: CreateConfiguracionWhatsappDto) {
    return this.whatsappService.createConfiguracion(createConfigDto);
  }

  @Get('configuracion/empresa/:empresaId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Obtener configuración de WhatsApp por empresa' })
  @ApiResponse({
    status: 200,
    description: 'Configuración encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  findConfiguracionByEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.whatsappService.findConfiguracionByEmpresa(empresaId);
  }

  @Patch('configuracion/empresa/:empresaId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración de WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  updateConfiguracion(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() updateConfigDto: UpdateConfiguracionWhatsappDto,
  ) {
    return this.whatsappService.updateConfiguracion(empresaId, updateConfigDto);
  }

  // ========================================
  // ENDPOINTS PARA MÉTRICAS
  // ========================================

  @Get('metricas/empresa/:empresaId/diarias')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Obtener métricas diarias de WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente',
  })
  @ApiQuery({
    name: 'fecha',
    required: false,
    description: 'Fecha específica (YYYY-MM-DD)',
  })
  getMetricasDiarias(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('fecha') fecha?: string,
  ) {
    const fechaBusqueda = fecha ? new Date(fecha) : undefined;
    return this.whatsappService.getMetricasDiarias(empresaId, fechaBusqueda);
  }

  @Post('metricas/empresa/:empresaId/actualizar')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Actualizar métricas de WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'Métricas actualizadas exitosamente',
  })
  @ApiQuery({
    name: 'fecha',
    required: false,
    description: 'Fecha específica (YYYY-MM-DD)',
  })
  actualizarMetricas(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('fecha') fecha?: string,
  ) {
    const fechaActualizacion = fecha ? new Date(fecha) : new Date();
    return this.whatsappService.actualizarMetricas(
      empresaId,
      fechaActualizacion,
    );
  }

  @Get('metricas/empresa/:empresaId/resumen')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Obtener resumen de métricas de WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'Resumen de métricas obtenido exitosamente',
  })
  @ApiQuery({
    name: 'fechaInicio',
    required: true,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaFin',
    required: true,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  getResumenMetricas(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    return this.whatsappService.getResumenMetricas(
      empresaId,
      new Date(fechaInicio),
      new Date(fechaFin),
    );
  }

  // ========================================
  // WEBHOOK PARA EVOLUTION API
  // ========================================

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook para recibir mensajes de Evolution API' })
  @ApiResponse({
    status: 200,
    description: 'Webhook procesado exitosamente',
  })
  async webhook(@Body() webhookData: any) {
    // TODO: Implementar lógica del webhook
    // Este endpoint recibirá los mensajes de Evolution API
    // y los procesará automáticamente
    console.log('Webhook recibido:', webhookData);
    return { status: 'ok', message: 'Webhook procesado' };
  }
}
