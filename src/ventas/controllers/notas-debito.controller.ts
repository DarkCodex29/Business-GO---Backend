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
import { NotasDebitoService } from '../services/notas-debito.service';
import { CreateNotaDebitoDto } from '../dto/create-nota-debito.dto';
import { UpdateNotaDebitoDto } from '../dto/update-nota-debito.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Notas de Débito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('notas-debito')
@Roles('ADMIN', 'EMPRESA')
export class NotasDebitoController {
  constructor(private readonly notasDebitoService: NotasDebitoService) {}

  @Post(':empresaId')
  @EmpresaPermissions('notas_debito.crear')
  @ApiOperation({
    summary: 'Crear una nueva nota de débito',
    description:
      'Crea una nueva nota de débito asociada a una factura existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Nota de débito creada exitosamente',
    type: CreateNotaDebitoDto,
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
    @Body() createNotaDebitoDto: CreateNotaDebitoDto,
  ) {
    return this.notasDebitoService.create(empresaId, createNotaDebitoDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions('notas_debito.ver')
  @ApiOperation({
    summary: 'Obtener todas las notas de débito',
    description: 'Retorna una lista de todas las notas de débito en el sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas de débito recuperada exitosamente',
    type: [CreateNotaDebitoDto],
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.notasDebitoService.findAll(empresaId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions('notas_debito.ver')
  @ApiOperation({
    summary: 'Obtener una nota de débito por ID',
    description: 'Retorna los detalles de una nota de débito específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la nota de débito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito encontrada exitosamente',
    type: CreateNotaDebitoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasDebitoService.findOne(empresaId, id);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('notas_debito.editar')
  @ApiOperation({
    summary: 'Actualizar una nota de débito',
    description: 'Actualiza los datos de una nota de débito existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la nota de débito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito actualizada exitosamente',
    type: UpdateNotaDebitoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una nota de débito pagada o anulada',
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaDebitoDto: UpdateNotaDebitoDto,
  ) {
    return this.notasDebitoService.update(empresaId, id, updateNotaDebitoDto);
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('notas_debito.eliminar')
  @ApiOperation({
    summary: 'Eliminar una nota de débito',
    description: 'Elimina una nota de débito del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la nota de débito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una nota de débito pagada',
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasDebitoService.remove(empresaId, id);
  }
}
