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
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { UsuariosService } from '../services/usuarios.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UsuarioEmpresaDto } from '../dto/usuario-empresa.dto';
import { UsuarioRolEmpresaDto } from '../dto/usuario-rol-empresa.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.USUARIOS.WRITE] })
  @ApiOperation({
    summary: 'Crear un nuevo usuario',
    description:
      'Crea un nuevo usuario en el sistema. Solo el super admin puede crear usuarios.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    schema: {
      example: {
        id_usuario: 1,
        nombre: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        telefono: '+51999999999',
        fecha_registro: '2024-03-20T15:30:00Z',
        activo: true,
        rol: {
          id_rol: 1,
          nombre: 'ADMIN',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: 'El email es inválido',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
    schema: {
      example: {
        statusCode: 409,
        message: 'El email ya está registrado',
        error: 'Conflict',
      },
    },
  })
  @ApiBody({ type: CreateUserDto })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usuariosService.create(createUserDto);
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.USUARIOS.READ] })
  @ApiOperation({
    summary: 'Obtener todos los usuarios',
    description:
      'Obtiene una lista paginada de usuarios con opciones de búsqueda.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    schema: {
      example: {
        data: [
          {
            id_usuario: 1,
            nombre: 'Juan Pérez',
            email: 'juan@ejemplo.com',
            telefono: '+51999999999',
            fecha_registro: '2024-03-20T15:30:00Z',
            activo: true,
            rol: {
              id_rol: 1,
              nombre: 'ADMIN',
            },
          },
        ],
        meta: {
          total: 50,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados por página',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Término de búsqueda',
  })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usuariosService.findAll(page, limit, search);
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.USUARIOS.READ] })
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.USUARIOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: Number })
  @ApiBody({ type: UpdateUserDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usuariosService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.USUARIOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remove(id);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña de usuario' })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBody({ type: ChangePasswordDto })
  changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.usuariosService.changePassword(
      changePasswordDto.usuario_id,
      changePasswordDto,
    );
  }

  @Post('asignar-empresa')
  @Roles(ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.EMPRESA.USUARIOS.ASSIGN] })
  @ApiOperation({ summary: 'Asignar un usuario a una empresa' })
  @ApiResponse({
    status: 201,
    description: 'Usuario asignado a empresa exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya está asignado a esta empresa',
  })
  asignarEmpresa(@Body() usuarioEmpresaDto: UsuarioEmpresaDto) {
    return this.usuariosService.asignarEmpresa(
      usuarioEmpresaDto.usuario_id,
      usuarioEmpresaDto.empresa_id,
      usuarioEmpresaDto.es_dueno,
    );
  }

  @Delete('remover-empresa/:usuarioId/:empresaId')
  @Roles(ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.EMPRESA.USUARIOS.DELETE] })
  @ApiOperation({ summary: 'Remover un usuario de una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Usuario removido de empresa exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrado' })
  removerEmpresa(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.usuariosService.removerEmpresa(usuarioId, empresaId);
  }

  @Post('asignar-rol-empresa')
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.ASSIGN] })
  @ApiOperation({ summary: 'Asignar un rol de empresa a un usuario' })
  @ApiResponse({ status: 201, description: 'Rol asignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario o rol no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya tiene asignado este rol',
  })
  asignarRolEmpresa(@Body() usuarioRolEmpresaDto: UsuarioRolEmpresaDto) {
    return this.usuariosService.asignarRolEmpresa(usuarioRolEmpresaDto);
  }

  @Delete('remover-rol-empresa/:usuarioId/:rolId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.ROLES.ASSIGN] })
  @ApiOperation({ summary: 'Remover un rol de empresa de un usuario' })
  @ApiResponse({ status: 200, description: 'Rol removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario o rol no encontrado' })
  removerRolEmpresa(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('rolId', ParseIntPipe) rolId: number,
  ) {
    return this.usuariosService.removerRolEmpresa(usuarioId, rolId);
  }
}
