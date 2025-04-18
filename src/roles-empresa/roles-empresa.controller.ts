import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RolesEmpresaService } from './roles-empresa.service';
import { CreateRolEmpresaDto } from './dto/create-rol-empresa.dto';
import { UpdateRolEmpresaDto } from './dto/update-rol-empresa.dto';

@ApiTags('Roles de Empresa')
@Controller('roles-empresa')
export class RolesEmpresaController {
  constructor(private readonly rolesEmpresaService: RolesEmpresaService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo rol de empresa',
    description: 'Crea un nuevo rol específico para una empresa',
  })
  @ApiResponse({
    status: 201,
    description: 'Rol de empresa creado exitosamente',
    type: CreateRolEmpresaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o empresa no encontrada',
  })
  create(@Body() createRolEmpresaDto: CreateRolEmpresaDto) {
    return this.rolesEmpresaService.create(createRolEmpresaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los roles de empresa',
    description:
      'Retorna una lista de todos los roles de empresa en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles de empresa recuperada exitosamente',
    type: [CreateRolEmpresaDto],
  })
  findAll() {
    return this.rolesEmpresaService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un rol de empresa por ID',
    description: 'Retorna los detalles de un rol de empresa específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del rol de empresa',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Rol de empresa encontrado exitosamente',
    type: CreateRolEmpresaDto,
  })
  @ApiResponse({ status: 404, description: 'Rol de empresa no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesEmpresaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un rol de empresa',
    description: 'Actualiza los datos de un rol de empresa existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del rol de empresa',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Rol de empresa actualizado exitosamente',
    type: UpdateRolEmpresaDto,
  })
  @ApiResponse({ status: 404, description: 'Rol de empresa no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolEmpresaDto: UpdateRolEmpresaDto,
  ) {
    return this.rolesEmpresaService.update(id, updateRolEmpresaDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un rol de empresa',
    description: 'Elimina un rol de empresa del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del rol de empresa',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Rol de empresa eliminado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar el rol porque tiene usuarios asignados',
  })
  @ApiResponse({ status: 404, description: 'Rol de empresa no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesEmpresaService.remove(id);
  }

  @Post(':id/permisos/:permisoId')
  @ApiOperation({
    summary: 'Asignar un permiso a un rol de empresa',
    description: 'Asigna un permiso específico a un rol de empresa',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del rol de empresa',
    type: 'number',
    example: 1,
  })
  @ApiParam({
    name: 'permisoId',
    description: 'ID del permiso',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Permiso asignado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol de empresa o permiso no encontrado',
  })
  asignarPermiso(
    @Param('id', ParseIntPipe) id: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
  ) {
    return this.rolesEmpresaService.asignarPermiso(id, permisoId);
  }

  @Delete(':id/permisos/:permisoId')
  @ApiOperation({
    summary: 'Remover un permiso de un rol de empresa',
    description: 'Elimina un permiso específico de un rol de empresa',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del rol de empresa',
    type: 'number',
    example: 1,
  })
  @ApiParam({
    name: 'permisoId',
    description: 'ID del permiso',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Permiso removido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol de empresa o permiso no encontrado',
  })
  removerPermiso(
    @Param('id', ParseIntPipe) id: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
  ) {
    return this.rolesEmpresaService.removerPermiso(id, permisoId);
  }
}
