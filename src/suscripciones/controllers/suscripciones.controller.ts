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
import { SuscripcionesService } from '../services/suscripciones.service';
import { CreateSuscripcionDto } from '../dto/create-suscripcion.dto';
import { UpdateSuscripcionDto } from '../dto/update-suscripcion.dto';
import { CreatePagoSuscripcionDto } from '../dto/create-pago-suscripcion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import {
  PlanSuscripcion,
  EstadoSuscripcion,
} from '../../common/enums/estados.enum';

@ApiTags('Suscripciones')
@Controller('suscripciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SuscripcionesController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva suscripción' })
  @ApiResponse({
    status: 201,
    description: 'La suscripción ha sido creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createSuscripcionDto: CreateSuscripcionDto) {
    return this.suscripcionesService.create(createSuscripcionDto);
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las suscripciones' })
  @ApiResponse({
    status: 200,
    description: 'Lista de suscripciones obtenida exitosamente',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'plan',
    required: false,
    enum: PlanSuscripcion,
    description: 'Filtrar por plan',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoSuscripcion,
    description: 'Filtrar por estado',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('plan') plan?: PlanSuscripcion,
    @Query('estado') estado?: EstadoSuscripcion,
  ) {
    return this.suscripcionesService.findAll(+page, +limit, plan, estado);
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Obtener una suscripción por ID' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.findOne(id);
  }

  @Get('empresa/:empresaId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Obtener suscripción por empresa' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción de la empresa encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  findByEmpresa(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.suscripcionesService.findByEmpresa(empresaId);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Actualizar una suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSuscripcionDto: UpdateSuscripcionDto,
  ) {
    return this.suscripcionesService.update(id, updateSuscripcionDto);
  }

  @Patch(':id/cambiar-plan')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Cambiar plan de suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Plan cambiado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  cambiarPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body('plan') plan: PlanSuscripcion,
  ) {
    return this.suscripcionesService.cambiarPlan(id, plan);
  }

  @Patch(':id/suspender')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Suspender suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción suspendida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  suspender(@Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.suspender(id);
  }

  @Patch(':id/reactivar')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Reactivar suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción reactivada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  reactivar(@Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.reactivar(id);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar una suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Suscripción eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.remove(id);
  }

  // ========================================
  // ENDPOINTS PARA PAGOS
  // ========================================

  @Post(':id/pagos')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  @ApiOperation({ summary: 'Registrar pago de suscripción' })
  @ApiResponse({
    status: 201,
    description: 'Pago registrado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPagoDto: CreatePagoSuscripcionDto,
  ) {
    createPagoDto.id_suscripcion = id;
    return this.suscripcionesService.createPago(createPagoDto);
  }

  @Get(':id/pagos')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Obtener pagos de una suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagos obtenida exitosamente',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  findPagos(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.suscripcionesService.findPagosBySuscripcion(id, +page, +limit);
  }

  // ========================================
  // ENDPOINTS PARA LÍMITES Y MÉTRICAS
  // ========================================

  @Get('empresa/:empresaId/limites')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPRESA_ADMIN)
  @ApiOperation({ summary: 'Verificar límites de la suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Límites verificados exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  verificarLimites(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.suscripcionesService.verificarLimites(empresaId);
  }
}
