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
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ProveedoresService } from '../services/proveedores.service';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';

@ApiTags('Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post(':empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear un nuevo proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({ status: 201, description: 'Proveedor creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createProveedorDto: CreateProveedorDto,
  ) {
    return this.proveedoresService.create(+empresaId, createProveedorDto);
  }

  @Get(':empresaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los proveedores de una empresa' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Lista de proveedores' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.proveedoresService.findAll(+empresaId);
  }

  @Get(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener un proveedor por ID' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor', type: 'number' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(+id);
  }

  @Patch(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor', type: 'number' })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  update(
    @Param('id') id: string,
    @Body() updateProveedorDto: UpdateProveedorDto,
  ) {
    return this.proveedoresService.update(+id, updateProveedorDto);
  }

  @Delete(':empresaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor', type: 'number' })
  @ApiResponse({ status: 200, description: 'Proveedor eliminado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  remove(@Param('id') id: string) {
    return this.proveedoresService.remove(+id);
  }

  @Post(':empresaId/:id/productos/:productoId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Agregar un producto a un proveedor' })
  addProducto(
    @Param('id') id: string,
    @Param('productoId') productoId: string,
    @Body() data: any,
    @Param('empresaId') empresaId: string,
  ) {
    return this.proveedoresService.addProducto(
      +id,
      +productoId,
      data,
      +empresaId,
    );
  }

  @Delete(':empresaId/:id/productos/:productoId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un producto de un proveedor' })
  removeProducto(
    @Param('id') id: string,
    @Param('productoId') productoId: string,
    @Param('empresaId') empresaId: string,
  ) {
    return this.proveedoresService.removeProducto(+id, +productoId, +empresaId);
  }
}
