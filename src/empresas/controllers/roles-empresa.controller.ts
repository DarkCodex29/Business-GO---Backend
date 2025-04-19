import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RolesEmpresaService } from '../services/roles-empresa.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequierePermiso } from '../../auth/decorators/permisos.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermisosGuard } from '../../auth/guards/permisos.guard';
import { AsignarRolDto } from '../dto/asignar-rol.dto';

@ApiTags('Roles Empresa')
@ApiExtraModels(CreateEmpresaRolDto, UpdateEmpresaRolDto)
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
    @Param('id_empresa') id_empresa: number,
    @Body() createRolDto: CreateEmpresaRolDto,
  ) {
    createRolDto.id_empresa = id_empresa;
    return this.rolesEmpresaService.crearRolEmpresa(createRolDto);
  }

  @Post('asignar')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Asignar un rol a un usuario' })
  @ApiResponse({ status: 201, description: 'Rol asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async asignarRol(
    @Param('id_empresa') id_empresa: number,
    @Body() asignarRolDto: AsignarRolDto,
  ) {
    asignarRolDto.id_empresa = id_empresa;
    return this.rolesEmpresaService.asignarRol(asignarRolDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los roles de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  async obtenerRoles(@Param('id_empresa') id_empresa: number) {
    return this.rolesEmpresaService.findAll(id_empresa);
  }

  @Delete(':id_rol')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un rol de la empresa' })
  @ApiResponse({ status: 200, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async eliminarRol(
    @Param('id_empresa') id_empresa: number,
    @Param('id_rol') id_rol: number,
  ) {
    return this.rolesEmpresaService.eliminarRol(id_empresa, id_rol);
  }

  @Post('inicializar')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Inicializar roles predefinidos para la empresa' })
  @ApiResponse({ status: 201, description: 'Roles inicializados exitosamente' })
  async inicializarRoles(@Param('id_empresa') id_empresa: number) {
    return this.rolesEmpresaService.inicializarRolesPredefinidos(id_empresa);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un rol específico de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Rol obtenido exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  findOne(@Param('id_empresa') id_empresa: number, @Param('id') id: number) {
    return this.rolesEmpresaService.obtenerRol(id_empresa, id);
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
    @Param('id_empresa') id_empresa: number,
    @Param('id') id: number,
    @Body() updateRolEmpresaDto: UpdateEmpresaRolDto,
  ) {
    return this.rolesEmpresaService.actualizarRol(
      id_empresa,
      id,
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
    @Param('id_empresa') id_empresa: number,
    @Param('id') id: number,
    @Body() asignarPermisoDto: AsignarPermisoRolEmpresaDto,
  ) {
    return this.rolesEmpresaService.asignarPermiso(
      id_empresa,
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
    @Param('id_empresa') id_empresa: number,
    @Param('id') id: number,
    @Param('permisoId') permisoId: number,
  ) {
    return this.rolesEmpresaService.eliminarPermiso(id_empresa, id, permisoId);
  }

  @Get('verificar-permiso')
  @RequierePermiso({ recurso: 'empresa', accion: 'leer' })
  @ApiOperation({
    summary: 'Verificar si un usuario tiene un permiso en una empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la verificación del permiso',
  })
  async verificarPermiso(
    @Param('id_usuario') id_usuario: number,
    @Param('id_empresa') id_empresa: number,
    @Query('recurso') recurso: string,
    @Query('accion') accion: string,
  ) {
    return this.rolesEmpresaService.verificarPermiso(
      id_usuario,
      id_empresa,
      recurso,
      accion,
    );
  }
}
