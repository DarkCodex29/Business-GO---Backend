import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClientesService } from '../services/clientes.service';
import { CreateClientDto } from '../dto/create-cliente.dto';
import { UpdateClientDto } from '../dto/update-cliente.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { ROLES } from '../../common/constants/roles.constant';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('clientes/:empresaId')
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.READ] })
  @ApiOperation({ summary: 'Obtener todos los clientes de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes obtenida exitosamente',
  })
  async getClientes(@Param('empresaId') empresaId: number) {
    return this.clientesService.getClientes(empresaId);
  }

  @Get(':clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.READ] })
  @ApiOperation({ summary: 'Obtener un cliente específico' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado exitosamente',
  })
  async getCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
  ) {
    return this.clientesService.getCliente(empresaId, clienteId);
  }

  @Post()
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.WRITE] })
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  async createCliente(
    @Param('empresaId') empresaId: number,
    @Body() createClienteDto: CreateClientDto,
  ) {
    return this.clientesService.createCliente(empresaId, createClienteDto);
  }

  @Patch(':clienteId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.CLIENTES.WRITE] })
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'clienteId', description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado exitosamente' })
  async updateCliente(
    @Param('empresaId') empresaId: number,
    @Param('clienteId') clienteId: number,
    @Body() updateClienteDto: UpdateClientDto,
  ) {
    return this.clientesService.updateCliente(
      empresaId,
      clienteId,
      updateClienteDto,
    );
  }
}
