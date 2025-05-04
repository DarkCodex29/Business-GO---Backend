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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Notas de Débito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/notas-debito')
export class NotasDebitoController {
  constructor(private readonly notasDebitoService: NotasDebitoService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_DEBITO.CREATE],
  })
  @ApiOperation({
    summary: 'Crear una nueva nota de débito',
    description:
      'Crea una nueva nota de débito asociada a una factura existente',
  })
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
    @EmpresaId() empresaId: number,
    @Body() createNotaDebitoDto: CreateNotaDebitoDto,
  ) {
    return this.notasDebitoService.create(empresaId, createNotaDebitoDto);
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_DEBITO.READ],
  })
  @ApiOperation({
    summary: 'Obtener todas las notas de débito',
    description: 'Retorna una lista de todas las notas de débito en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas de débito recuperada exitosamente',
    type: [CreateNotaDebitoDto],
  })
  findAll(@EmpresaId() empresaId: number) {
    return this.notasDebitoService.findAll(empresaId);
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_DEBITO.READ],
  })
  @ApiOperation({
    summary: 'Obtener una nota de débito por ID',
    description: 'Retorna los detalles de una nota de débito específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la nota de débito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito encontrada exitosamente',
    type: CreateNotaDebitoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasDebitoService.findOne(empresaId, id);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_DEBITO.UPDATE],
  })
  @ApiOperation({
    summary: 'Actualizar una nota de débito',
    description: 'Actualiza los datos de una nota de débito existente',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaDebitoDto: UpdateNotaDebitoDto,
  ) {
    return this.notasDebitoService.update(empresaId, id, updateNotaDebitoDto);
  }

  @Delete(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_DEBITO.DELETE],
  })
  @ApiOperation({
    summary: 'Eliminar una nota de débito',
    description: 'Elimina una nota de débito del sistema',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasDebitoService.remove(empresaId, id);
  }
}
