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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Notas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/notas-credito')
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_CREDITO.CREATE],
  })
  @ApiOperation({
    summary: 'Crear una nueva nota de crédito',
    description:
      'Crea una nueva nota de crédito asociada a una factura existente',
  })
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
    @EmpresaId() empresaId: number,
    @Body() createNotaCreditoDto: CreateNotaCreditoDto,
  ) {
    return this.notasCreditoService.create(empresaId, createNotaCreditoDto);
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
    permissions: [PERMISSIONS.VENTAS.NOTAS_CREDITO.READ],
  })
  @ApiOperation({
    summary: 'Obtener todas las notas de crédito',
    description:
      'Retorna una lista de todas las notas de crédito en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas de crédito recuperada exitosamente',
    type: [CreateNotaCreditoDto],
  })
  findAll(@EmpresaId() empresaId: number) {
    return this.notasCreditoService.findAll(empresaId);
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
    permissions: [PERMISSIONS.VENTAS.NOTAS_CREDITO.READ],
  })
  @ApiOperation({
    summary: 'Obtener una nota de crédito por ID',
    description: 'Retorna los detalles de una nota de crédito específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la nota de crédito' })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito encontrada exitosamente',
    type: CreateNotaCreditoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasCreditoService.findOne(empresaId, id);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_CREDITO.UPDATE],
  })
  @ApiOperation({
    summary: 'Actualizar una nota de crédito',
    description: 'Actualiza los datos de una nota de crédito existente',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaCreditoDto: UpdateNotaCreditoDto,
  ) {
    return this.notasCreditoService.update(empresaId, id, updateNotaCreditoDto);
  }

  @Delete(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.NOTAS_CREDITO.DELETE],
  })
  @ApiOperation({
    summary: 'Eliminar una nota de crédito',
    description: 'Elimina una nota de crédito del sistema',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notasCreditoService.remove(empresaId, id);
  }
}
