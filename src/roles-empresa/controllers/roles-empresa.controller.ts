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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RolesEmpresaService } from '../services/roles-empresa.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';
import { AsignarRolDto } from '../dto/asignar-rol.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Roles Empresa')
@ApiBearerAuth()
@Controller('roles-empresa')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
export class RolesEmpresaController {
  constructor(private readonly rolesEmpresaService: RolesEmpresaService) {}

  @Post()
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.WRITE] })
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
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.READ] })
  @ApiOperation({ summary: 'Obtener todos los roles de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  obtenerRoles(@Param('empresaId') empresaId: string) {
    return this.rolesEmpresaService.findAll(+empresaId);
  }

  @Post('asignar-rol')
  @ApiOperation({ summary: 'Asignar un rol a un usuario' })
  @ApiResponse({ status: 201, description: 'Rol asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario o rol no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya tiene asignado este rol',
  })
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.ASSIGN] })
  async asignarRol(
    @EmpresaId() empresaId: number,
    @Body() asignarRolDto: AsignarRolDto,
  ) {
    return this.rolesEmpresaService.asignarRol(empresaId, asignarRolDto);
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.DELETE] })
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
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.READ] })
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
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.WRITE] })
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
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.WRITE] })
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
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.ASSIGN] })
  @ApiOperation({ summary: 'Asignar permisos a un rol de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({
    status: 201,
    description: 'Permisos asignados exitosamente',
  })
  asignarPermisos(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() asignarPermisoDto: AsignarPermisoRolEmpresaDto,
  ) {
    asignarPermisoDto.rol_id = +id;
    return this.rolesEmpresaService.asignarPermisos(
      +empresaId,
      +id,
      asignarPermisoDto.permisos,
    );
  }

  @Delete(':id/permisos/:permisoId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.ASSIGN] })
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
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.READ] })
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

  @Delete('remover-rol/:id_usuario/:id_rol')
  @ApiOperation({ summary: 'Remover un rol de un usuario' })
  @ApiParam({ name: 'id_usuario', description: 'ID del usuario' })
  @ApiParam({ name: 'id_rol', description: 'ID del rol' })
  @ApiResponse({ status: 200, description: 'Rol removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario o rol no encontrado' })
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.ASSIGN] })
  async removerRol(
    @EmpresaId() empresaId: number,
    @Param('id_usuario', ParseIntPipe) id_usuario: number,
    @Param('id_rol', ParseIntPipe) id_rol: number,
  ) {
    return this.rolesEmpresaService.removerRol(empresaId, id_usuario, id_rol);
  }
}
