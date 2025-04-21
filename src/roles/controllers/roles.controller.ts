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
import { RolesService } from '../services/roles.service';
import { CreateRolDto } from '../dto/create-rol.dto';
import { UpdateRolDto } from '../dto/update-rol.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AsignarPermisosDto } from '../dto/asignar-permisos.dto';

@ApiTags('Roles del Sistema')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Crear un nuevo rol del sistema',
    description: 'Crea un nuevo rol en el sistema.',
  })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El rol ya existe' })
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolesService.create(createRolDto);
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Obtener todos los roles del sistema',
    description: 'Retorna la lista de roles del sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 409, description: 'El nombre del rol ya existe' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolDto: UpdateRolDto,
  ) {
    return this.rolesService.update(id, updateRolDto);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({ status: 200, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar el rol porque tiene usuarios asociados',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Post(':id/permisos')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Asignar permisos a un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({ status: 200, description: 'Permisos asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  asignarPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body() asignarPermisosDto: AsignarPermisosDto,
  ) {
    return this.rolesService.asignarPermisos(id, asignarPermisosDto);
  }

  @Delete(':id/permisos/:permisoId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remover un permiso de un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiParam({ name: 'permisoId', description: 'ID del permiso' })
  @ApiResponse({ status: 200, description: 'Permiso removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol o permiso no encontrado' })
  removerPermiso(
    @Param('id', ParseIntPipe) id: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
  ) {
    return this.rolesService.removerPermiso(id, permisoId);
  }
}
