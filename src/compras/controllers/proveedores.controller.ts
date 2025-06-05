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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post(':empresaId')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.WRITE] })
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
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.READ] })
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
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.READ] })
  @ApiOperation({ summary: 'Obtener un proveedor por ID' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  findOne(@Param('id') id: number, @Param('empresaId') empresaId: number) {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':empresaId/:id')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.WRITE] })
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Proveedor actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  update(
    @Param('id') id: number,
    @Body() updateProveedorDto: UpdateProveedorDto,
    @Param('empresaId') empresaId: number,
  ) {
    return this.proveedoresService.update(id, empresaId, updateProveedorDto);
  }

  @Delete(':empresaId/:id')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.WRITE] })
  @ApiOperation({ summary: 'Eliminar un proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Proveedor eliminado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  remove(@Param('id') id: number, @Param('empresaId') empresaId: number) {
    return this.proveedoresService.remove(id, empresaId);
  }

  @Post(':empresaId/:id/producto/:productoId')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.WRITE] })
  @ApiOperation({ summary: 'Asignar un producto a un proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    type: 'number',
  })
  @ApiParam({
    name: 'productoId',
    description: 'ID del producto',
    type: 'number',
  })
  @ApiResponse({ status: 201, description: 'Producto asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Proveedor o producto no encontrado',
  })
  addProducto(
    @Param('id') id: string,
    @Param('productoId') productoId: string,
    @Body() data: any,
    @Param('empresaId') empresaId: string,
  ) {
    return this.proveedoresService.addProducto(
      +id,
      +productoId,
      +empresaId,
      data,
    );
  }

  @Delete(':empresaId/:id/producto/:productoId')
  @Roles(ROLES.ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.PROVEEDORES.WRITE] })
  @ApiOperation({ summary: 'Eliminar un producto de un proveedor' })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    type: 'number',
  })
  @ApiParam({
    name: 'productoId',
    description: 'ID del producto',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Producto eliminado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Proveedor o producto no encontrado',
  })
  removeProducto(
    @Param('id') id: number,
    @Param('productoId') productoId: number,
    @Param('empresaId') empresaId: number,
  ) {
    return this.proveedoresService.removeProducto(id, productoId, empresaId);
  }
}
