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
import { RolesEmpresaService } from '../services/roles-empresa.service';
import { CreateRolEmpresaDto } from '../dto/create-rol-empresa.dto';
import { UpdateRolEmpresaDto } from '../dto/update-rol-empresa.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequierePermiso } from '../../auth/decorators/permisos.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermisosGuard } from '../../auth/guards/permisos.guard';
import { AsignarRolDto } from '../dto/asignar-rol.dto';

@ApiTags('Roles de Empresa')
@Controller('empresas/:id_empresa/roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@ApiBearerAuth()
export class RolesEmpresaController {
  constructor(private readonly rolesEmpresaService: RolesEmpresaService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear un nuevo rol para la empresa' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async crearRol(
    @Param('id_empresa') id_empresa: string,
    @Body() createRolDto: CreateRolEmpresaDto,
  ) {
    return this.rolesEmpresaService.crearRolEmpresa(id_empresa, createRolDto);
  }

  @Post('asignar')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Asignar un rol a un usuario' })
  @ApiResponse({ status: 201, description: 'Rol asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async asignarRol(
    @Param('id_empresa') id_empresa: string,
    @Body() asignarRolDto: AsignarRolDto,
  ) {
    return this.rolesEmpresaService.asignarRolAUsuario(
      id_empresa,
      asignarRolDto.id_usuario,
      asignarRolDto.id_rol,
      asignarRolDto.fecha_inicio,
      asignarRolDto.fecha_fin,
    );
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los roles de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  async obtenerRoles(@Param('id_empresa') id_empresa: string) {
    return this.rolesEmpresaService.obtenerRolesEmpresa(id_empresa);
  }

  @Delete(':id_rol')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un rol de la empresa' })
  @ApiResponse({ status: 200, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async eliminarRol(
    @Param('id_empresa') id_empresa: string,
    @Param('id_rol') id_rol: string,
  ) {
    return this.rolesEmpresaService.eliminarRolEmpresa(id_empresa, id_rol);
  }

  @Post('inicializar')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Inicializar roles predefinidos para la empresa' })
  @ApiResponse({ status: 201, description: 'Roles inicializados exitosamente' })
  async inicializarRoles(@Param('id_empresa') id_empresa: string) {
    return this.rolesEmpresaService.inicializarRolesPredefinidos(id_empresa);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un rol específico de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Rol obtenido exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  findOne(@Param('id_empresa') id_empresa: string, @Param('id') id: string) {
    return this.rolesEmpresaService.obtenerRol(
      BigInt(id_empresa),
      parseInt(id),
    );
  }

  @Patch(':id')
  @RequierePermiso({ recurso: 'empresa', accion: 'actualizar' })
  @ApiOperation({ summary: 'Actualizar un rol de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Rol actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  update(
    @Param('id_empresa') id_empresa: string,
    @Param('id') id: string,
    @Body() updateRolEmpresaDto: UpdateRolEmpresaDto,
  ) {
    return this.rolesEmpresaService.actualizarRol(
      BigInt(id_empresa),
      parseInt(id),
      updateRolEmpresaDto,
    );
  }

  @Post(':id/permisos')
  @RequierePermiso({ recurso: 'empresa', accion: 'actualizar' })
  @ApiOperation({ summary: 'Asignar un permiso a un rol de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Permiso asignado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Rol o permiso no encontrado' })
  asignarPermiso(
    @Param('id_empresa') id_empresa: string,
    @Param('id') id: string,
    @Body() asignarPermisoDto: AsignarPermisoRolEmpresaDto,
  ) {
    return this.rolesEmpresaService.asignarPermiso(
      BigInt(id_empresa),
      asignarPermisoDto,
    );
  }

  @Delete(':id/permisos/:permisoId')
  @RequierePermiso({ recurso: 'empresa', accion: 'actualizar' })
  @ApiOperation({ summary: 'Eliminar un permiso de un rol de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Permiso eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Rol o permiso no encontrado' })
  eliminarPermiso(
    @Param('id_empresa') id_empresa: string,
    @Param('id') id: string,
    @Param('permisoId') permisoId: string,
  ) {
    return this.rolesEmpresaService.eliminarPermiso(
      BigInt(id_empresa),
      parseInt(id),
      parseInt(permisoId),
    );
  }
}
