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
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsuarioEmpresaDto } from './dto/usuario-empresa.dto';
import { UsuarioRolEmpresaDto } from './dto/usuario-rol-empresa.dto';
import { Autenticacion2FADto } from './dto/autenticacion-2fa.dto';
import { SesionUsuarioDto } from './dto/sesion-usuario.dto';
import { PermisoUsuarioDto } from './dto/permiso-usuario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequierePermiso } from '../auth/decorators/permisos.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @RequierePermiso({ recurso: 'usuario', accion: 'crear' })
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequierePermiso({ recurso: 'usuario', accion: 'leer' })
  @ApiOperation({ summary: 'Obtener lista de usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page, limit, search);
  }

  @Get(':id')
  @RequierePermiso({ recurso: 'usuario', accion: 'leer' })
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequierePermiso({ recurso: 'usuario', accion: 'actualizar' })
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El email ya está en uso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @RequierePermiso({ recurso: 'usuario', accion: 'eliminar' })
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('empresa')
  @ApiOperation({ summary: 'Asignar usuario a una empresa' })
  @ApiResponse({
    status: 201,
    description: 'Usuario asignado a empresa exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrado' })
  async asignarEmpresa(@Body() usuarioEmpresaDto: UsuarioEmpresaDto) {
    return await this.usersService.asignarEmpresa(
      usuarioEmpresaDto.usuario_id,
      usuarioEmpresaDto.empresa_id,
      usuarioEmpresaDto.es_dueno,
    );
  }

  @Delete('empresa/:usuarioId/:empresaId')
  @ApiOperation({ summary: 'Remover usuario de una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Usuario removido de empresa exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrado' })
  async removerEmpresa(
    @Param('usuarioId') usuarioId: number,
    @Param('empresaId') empresaId: number,
  ) {
    return await this.usersService.removerEmpresa(usuarioId, empresaId);
  }

  @Post('rol-empresa')
  @ApiOperation({ summary: 'Asignar rol de empresa a un usuario' })
  @ApiResponse({ status: 201, description: 'Rol asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario o rol no encontrado' })
  async asignarRolEmpresa(@Body() usuarioRolEmpresaDto: UsuarioRolEmpresaDto) {
    return await this.usersService.asignarRolEmpresa(usuarioRolEmpresaDto);
  }

  @Delete('rol-empresa/:usuarioId/:rolId')
  @ApiOperation({ summary: 'Remover rol de empresa de un usuario' })
  @ApiResponse({ status: 200, description: 'Rol removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  async removerRolEmpresa(
    @Param('usuarioId') usuarioId: number,
    @Param('rolId') rolId: number,
  ) {
    return await this.usersService.removerRolEmpresa(usuarioId, rolId);
  }

  @Post('2fa')
  @ApiOperation({
    summary: 'Configurar o actualizar autenticación 2FA para un usuario',
  })
  @ApiResponse({ status: 201, description: '2FA configurado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async configurar2FA(@Body() autenticacion2FADto: Autenticacion2FADto) {
    return await this.usersService.configurar2FA(autenticacion2FADto);
  }

  @Delete('2fa/:id_usuario')
  @ApiOperation({ summary: 'Desactivar autenticación 2FA para un usuario' })
  @ApiResponse({ status: 200, description: '2FA desactivado exitosamente' })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado o 2FA no configurado',
  })
  async desactivar2FA(@Param('id_usuario', ParseIntPipe) id_usuario: number) {
    return await this.usersService.desactivar2FA(id_usuario);
  }

  @Post('sesion')
  @ApiOperation({ summary: 'Crear una nueva sesión de usuario' })
  @ApiResponse({ status: 201, description: 'Sesión creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async crearSesion(@Body() sesionUsuarioDto: SesionUsuarioDto) {
    return await this.usersService.crearSesion(sesionUsuarioDto);
  }

  @Post('permiso')
  @ApiOperation({ summary: 'Asignar un permiso a un usuario' })
  @ApiResponse({ status: 201, description: 'Permiso asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario o permiso no encontrado' })
  async asignarPermiso(@Body() permisoUsuarioDto: PermisoUsuarioDto) {
    return await this.usersService.asignarPermiso(permisoUsuarioDto);
  }

  @Delete('permiso/:usuarioId/:permisoId')
  @ApiOperation({ summary: 'Remover un permiso de un usuario' })
  @ApiResponse({ status: 200, description: 'Permiso removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  async removerPermiso(
    @Param('usuarioId') usuarioId: number,
    @Param('permisoId') permisoId: number,
  ) {
    return await this.usersService.removerPermiso(usuarioId, permisoId);
  }
}
