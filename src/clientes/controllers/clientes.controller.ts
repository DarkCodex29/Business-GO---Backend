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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.ver')
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
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.ver')
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
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.crear')
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
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('clientes.editar')
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
