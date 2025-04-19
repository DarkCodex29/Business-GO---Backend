import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotasCreditoService } from '../services/notas-credito.service';
import { CreateNotaCreditoDto } from '../dto/create-nota-credito.dto';
import { UpdateNotaCreditoDto } from '../dto/update-nota-credito.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Notas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/notas-credito')
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('notas_credito.crear')
  @ApiOperation({
    summary: 'Crear una nueva nota de crédito',
    description: 'Crea una nueva nota de crédito para una factura',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Nota de crédito creada exitosamente',
    type: CreateNotaCreditoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La factura ya tiene una nota de crédito',
  })
  @ApiResponse({
    status: 404,
    description: 'Factura no encontrada',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createNotaCreditoDto: CreateNotaCreditoDto,
  ) {
    return this.notasCreditoService.create(empresaId, createNotaCreditoDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('notas_credito.ver')
  @ApiOperation({
    summary: 'Obtener todas las notas de crédito',
    description:
      'Retorna una lista de todas las notas de crédito de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas de crédito recuperada exitosamente',
    type: [CreateNotaCreditoDto],
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.notasCreditoService.findAll(empresaId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('notas_credito.ver')
  @ApiOperation({
    summary: 'Obtener una nota de crédito',
    description: 'Retorna una nota de crédito específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de crédito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito encontrada exitosamente',
    type: CreateNotaCreditoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasCreditoService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('notas_credito.editar')
  @ApiOperation({
    summary: 'Actualizar una nota de crédito',
    description: 'Actualiza una nota de crédito existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de crédito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito actualizada exitosamente',
    type: UpdateNotaCreditoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaCreditoDto: UpdateNotaCreditoDto,
  ) {
    return this.notasCreditoService.update(id, empresaId, updateNotaCreditoDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('notas_credito.eliminar')
  @ApiOperation({
    summary: 'Eliminar una nota de crédito',
    description: 'Elimina una nota de crédito del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de crédito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una nota de crédito anulada',
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasCreditoService.remove(id, empresaId);
  }
}
