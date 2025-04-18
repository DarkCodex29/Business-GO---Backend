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

  @Post(':id/empresas/:empresaId')
  @ApiOperation({ summary: 'Asignar empresa a usuario' })
  @ApiResponse({ status: 201, description: 'Empresa asignada' })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrado' })
  asignarEmpresa(
    @Param('id', ParseIntPipe) id: number,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body('esDueno') esDueno: boolean = false,
  ) {
    return this.usersService.asignarEmpresa(id, empresaId, esDueno);
  }

  @Delete(':id/empresas/:empresaId')
  @ApiOperation({ summary: 'Remover empresa de usuario' })
  @ApiResponse({ status: 200, description: 'Empresa removida' })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrado' })
  removerEmpresa(
    @Param('id', ParseIntPipe) id: number,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.usersService.removerEmpresa(id, empresaId);
  }

  @Get(':id/empresas')
  @ApiOperation({ summary: 'Obtener empresas de usuario' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  obtenerEmpresas(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.obtenerEmpresasUsuario(id);
  }
}
