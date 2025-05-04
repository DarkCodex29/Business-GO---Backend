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
import { MetodosPagoService } from '../services/metodos-pago.service';
import { CreateMetodoPagoDto } from '../dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from '../dto/update-metodo-pago.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Métodos de Pago')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/metodos-pago')
export class MetodosPagoController {
  constructor(private readonly metodosPagoService: MetodosPagoService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.WRITE],
  })
  @ApiOperation({
    summary: 'Crear un nuevo método de pago',
    description: 'Crea un nuevo método de pago en el sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Método de pago creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(
    @EmpresaId() empresaId: number,
    @Body() createMetodoPagoDto: CreateMetodoPagoDto,
  ) {
    return this.metodosPagoService.create(empresaId, createMetodoPagoDto);
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
    permissions: [PERMISSIONS.VENTAS.READ],
  })
  @ApiOperation({
    summary: 'Obtener todos los métodos de pago',
    description: 'Retorna una lista de todos los métodos de pago',
  })
  @ApiResponse({ status: 200, description: 'Lista de métodos de pago' })
  findAll(@EmpresaId() empresaId: number) {
    return this.metodosPagoService.findAll(empresaId);
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
    permissions: [PERMISSIONS.VENTAS.READ],
  })
  @ApiOperation({
    summary: 'Obtener un método de pago',
    description: 'Retorna los detalles de un método de pago específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del método de pago',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Detalles del método de pago' })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.metodosPagoService.findOne(empresaId, id);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.WRITE],
  })
  @ApiOperation({
    summary: 'Actualizar un método de pago',
    description: 'Actualiza los datos de un método de pago existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del método de pago',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Método de pago actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  update(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMetodoPagoDto: UpdateMetodoPagoDto,
  ) {
    return this.metodosPagoService.update(empresaId, id, updateMetodoPagoDto);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({
    permissions: [PERMISSIONS.VENTAS.PAGOS.DELETE],
  })
  @ApiOperation({
    summary: 'Eliminar un método de pago',
    description: 'Elimina un método de pago del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del método de pago',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Método de pago eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  remove(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.metodosPagoService.remove(empresaId, id);
  }
}
