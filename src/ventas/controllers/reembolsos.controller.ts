import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ReembolsosService } from '../services/reembolsos.service';
import { CreateReembolsoDto } from '../dto/create-reembolso.dto';
import { UpdateReembolsoDto } from '../dto/update-reembolso.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Reembolsos')
@Controller('empresas/:empresaId/reembolsos')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles('ADMIN', 'EMPRESA')
export class ReembolsosController {
  constructor(private readonly reembolsosService: ReembolsosService) {}

  @Post()
  @EmpresaPermissions('reembolsos.crear')
  @ApiOperation({
    summary: 'Crear un nuevo reembolso',
    description: 'Crea un nuevo reembolso asociado a una empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Reembolso creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o monto excede el pago',
  })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createReembolsoDto: CreateReembolsoDto,
  ) {
    return this.reembolsosService.create(empresaId, createReembolsoDto);
  }

  @Get()
  @EmpresaPermissions('reembolsos.ver')
  @ApiOperation({
    summary: 'Obtener todos los reembolsos',
    description: 'Retorna una lista de todos los reembolsos de una empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reembolsos obtenida exitosamente',
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.reembolsosService.findAll(empresaId);
  }

  @Get(':id')
  @EmpresaPermissions('reembolsos.ver')
  @ApiOperation({
    summary: 'Obtener un reembolso específico',
    description: 'Retorna los detalles de un reembolso específico',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({
    status: 200,
    description: 'Reembolso encontrado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.findOne(empresaId, id);
  }

  @Patch(':id')
  @EmpresaPermissions('reembolsos.editar')
  @ApiOperation({
    summary: 'Actualizar un reembolso',
    description: 'Actualiza los datos de un reembolso existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({
    status: 200,
    description: 'Reembolso actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o monto excede el pago',
  })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReembolsoDto: UpdateReembolsoDto,
  ) {
    return this.reembolsosService.update(empresaId, id, updateReembolsoDto);
  }

  @Delete(':id')
  @EmpresaPermissions('reembolsos.eliminar')
  @ApiOperation({
    summary: 'Eliminar un reembolso',
    description: 'Elimina un reembolso del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({ status: 200, description: 'Reembolso eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.remove(empresaId, id);
  }
}
