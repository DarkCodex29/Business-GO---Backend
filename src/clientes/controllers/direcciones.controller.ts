import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DireccionesService } from '../services/direcciones.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Direcciones')
@ApiBearerAuth()
@Controller('direcciones/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.ADMIN)
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Post('clientes/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.WRITE] })
  @ApiOperation({ summary: 'Crear una dirección para un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 201,
    description: 'Dirección creada exitosamente',
  })
  createDireccion(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() createDireccionDto: CreateClienteDireccionDto,
  ) {
    return this.direccionesService.createDireccion(
      empresaId,
      clienteId,
      createDireccionDto,
    );
  }

  @Get('clientes/:clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.READ] })
  @ApiOperation({ summary: 'Obtener direcciones de un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de direcciones del cliente',
  })
  getDireccionesCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return this.direccionesService.getDireccionesCliente(empresaId, clienteId);
  }

  @Get(':direccionId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.READ] })
  @ApiOperation({ summary: 'Obtener una dirección específica' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'direccionId', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección encontrada exitosamente',
  })
  getDireccion(
    @Param('empresaId') empresaId: number,
    @Param('direccionId') direccionId: number,
  ) {
    return this.direccionesService.getDireccion(empresaId, direccionId);
  }

  @Patch(':direccionId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.WRITE] })
  @ApiOperation({ summary: 'Actualizar una dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'direccionId', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección actualizada exitosamente',
  })
  updateDireccion(
    @Param('empresaId') empresaId: number,
    @Param('direccionId') direccionId: number,
    @Body() updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    return this.direccionesService.updateDireccion(
      empresaId,
      direccionId,
      updateDireccionDto,
    );
  }

  @Delete(':direccionId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.DELETE] })
  @ApiOperation({ summary: 'Eliminar una dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'direccionId', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección eliminada exitosamente',
  })
  deleteDireccion(
    @Param('empresaId') empresaId: number,
    @Param('direccionId') direccionId: number,
  ) {
    return this.direccionesService.deleteDireccion(empresaId, direccionId);
  }
}
