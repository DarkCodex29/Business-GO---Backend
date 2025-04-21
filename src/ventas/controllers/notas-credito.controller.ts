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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotasCreditoService } from '../services/notas-credito.service';
import { CreateNotaCreditoDto } from '../dto/create-nota-credito.dto';
import { UpdateNotaCreditoDto } from '../dto/update-nota-credito.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Notas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('notas-credito')
@Roles('ADMIN', 'EMPRESA')
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Post(':empresaId')
  @EmpresaPermissions('notas_credito.crear')
  @ApiOperation({
    summary: 'Crear una nueva nota de crédito',
    description:
      'Crea una nueva nota de crédito asociada a una factura existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Nota de crédito creada exitosamente',
    type: CreateNotaCreditoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la factura no está en estado válido',
  })
  @ApiResponse({
    status: 404,
    description: 'Factura, empresa o cliente no encontrado',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createNotaCreditoDto: CreateNotaCreditoDto,
  ) {
    return this.notasCreditoService.create(empresaId, createNotaCreditoDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions('notas_credito.ver')
  @ApiOperation({
    summary: 'Obtener todas las notas de crédito',
    description:
      'Retorna una lista de todas las notas de crédito en el sistema',
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

  @Get(':empresaId/:id')
  @EmpresaPermissions('notas_credito.ver')
  @ApiOperation({
    summary: 'Obtener una nota de crédito por ID',
    description: 'Retorna los detalles de una nota de crédito específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la nota de crédito' })
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
    return this.notasCreditoService.findOne(+empresaId, +id);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('notas_credito.editar')
  @ApiOperation({
    summary: 'Actualizar una nota de crédito',
    description: 'Actualiza los datos de una nota de crédito existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la nota de crédito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito actualizada exitosamente',
    type: UpdateNotaCreditoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una nota de crédito pagada o anulada',
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaCreditoDto: UpdateNotaCreditoDto,
  ) {
    return this.notasCreditoService.update(
      +empresaId,
      +id,
      updateNotaCreditoDto,
    );
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('notas_credito.eliminar')
  @ApiOperation({
    summary: 'Eliminar una nota de crédito',
    description: 'Elimina una nota de crédito del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la nota de crédito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una nota de crédito pagada',
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasCreditoService.remove(+empresaId, +id);
  }
}
