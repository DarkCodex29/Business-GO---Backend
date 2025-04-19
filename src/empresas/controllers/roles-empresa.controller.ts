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
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesEmpresaService } from '../services/roles-empresa.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';
import { AsignarRolDto } from '../dto/asignar-rol.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Roles de Empresa')
@ApiBearerAuth()
@Controller('roles-empresa/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles('ADMIN', 'EMPRESA')
export class RolesEmpresaController {
  constructor(private readonly rolesEmpresaService: RolesEmpresaService) {}

  @Post()
  @EmpresaPermissions('roles.crear')
  @ApiOperation({ summary: 'Crear un nuevo rol para la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Rol creado exitosamente',
  })
  crearRol(
    @Param('empresaId') empresaId: string,
    @Body() createRolDto: CreateEmpresaRolDto,
  ) {
    createRolDto.id_empresa = +empresaId;
    return this.rolesEmpresaService.crearRolEmpresa(createRolDto);
  }

  @Get()
  @EmpresaPermissions('roles.ver')
  @ApiOperation({ summary: 'Obtener todos los roles de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  obtenerRoles(@Param('empresaId') empresaId: string) {
    return this.rolesEmpresaService.findAll(+empresaId);
  }

  @Post('asignar')
  @EmpresaPermissions('roles.asignar')
  @ApiOperation({ summary: 'Asignar un rol a un usuario' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Rol asignado exitosamente',
  })
  asignarRol(
    @Param('empresaId') empresaId: string,
    @Body() asignarRolDto: AsignarRolDto,
  ) {
    asignarRolDto.id_empresa = +empresaId;
    return this.rolesEmpresaService.asignarRol(asignarRolDto);
  }

  @Delete(':id')
  @EmpresaPermissions('roles.eliminar')
  @ApiOperation({ summary: 'Eliminar un rol de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({
    status: 200,
    description: 'Rol eliminado exitosamente',
  })
  eliminarRol(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.rolesEmpresaService.eliminarRol(+empresaId, +id);
  }

  @Get(':id')
  @EmpresaPermissions('roles.ver')
  @ApiOperation({ summary: 'Obtener un rol específico de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({
    status: 200,
    description: 'Rol encontrado exitosamente',
  })
  obtenerRol(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.rolesEmpresaService.obtenerRol(+empresaId, +id);
  }

  @Patch(':id')
  @EmpresaPermissions('roles.editar')
  @ApiOperation({ summary: 'Actualizar un rol de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({
    status: 200,
    description: 'Rol actualizado exitosamente',
  })
  actualizarRol(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateRolEmpresaDto: UpdateEmpresaRolDto,
  ) {
    return this.rolesEmpresaService.actualizarRol(
      +empresaId,
      +id,
      updateRolEmpresaDto,
    );
  }

  @Post('inicializar')
  @EmpresaPermissions('roles.crear')
  @ApiOperation({ summary: 'Inicializar roles predefinidos para la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Roles predefinidos inicializados exitosamente',
  })
  inicializarRoles(@Param('empresaId') empresaId: string) {
    return this.rolesEmpresaService.inicializarRolesPredefinidos(+empresaId);
  }

  @Post(':id/permisos')
  @EmpresaPermissions('roles.asignar_permisos')
  @ApiOperation({ summary: 'Asignar un permiso a un rol de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({
    status: 201,
    description: 'Permiso asignado exitosamente',
  })
  asignarPermiso(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() asignarPermisoDto: AsignarPermisoRolEmpresaDto,
  ) {
    asignarPermisoDto.rol_id = +id;
    return this.rolesEmpresaService.asignarPermiso(
      +empresaId,
      asignarPermisoDto,
    );
  }

  @Delete(':id/permisos/:permisoId')
  @EmpresaPermissions('roles.asignar_permisos')
  @ApiOperation({ summary: 'Eliminar un permiso de un rol de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiParam({ name: 'permisoId', description: 'ID del permiso' })
  @ApiResponse({
    status: 200,
    description: 'Permiso eliminado exitosamente',
  })
  eliminarPermiso(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('permisoId') permisoId: string,
  ) {
    return this.rolesEmpresaService.eliminarPermiso(
      +empresaId,
      +id,
      +permisoId,
    );
  }

  @Get('verificar-permiso')
  @EmpresaPermissions('roles.ver')
  @ApiOperation({
    summary: 'Verificar si un usuario tiene un permiso en una empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiQuery({ name: 'recurso', description: 'Recurso a verificar' })
  @ApiQuery({ name: 'accion', description: 'Acción a verificar' })
  @ApiResponse({
    status: 200,
    description: 'Verificación de permiso completada',
  })
  verificarPermiso(
    @Param('empresaId') empresaId: string,
    @Query('usuarioId') usuarioId: string,
    @Query('recurso') recurso: string,
    @Query('accion') accion: string,
  ) {
    return this.rolesEmpresaService.verificarPermiso(
      +usuarioId,
      +empresaId,
      recurso,
      accion,
    );
  }
}
