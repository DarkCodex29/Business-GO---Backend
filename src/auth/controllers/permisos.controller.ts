import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermisosService } from '../services/permisos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Permisos')
@Controller('permisos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los permisos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos',
  })
  async findAll() {
    return this.permisosService.findAll();
  }

  @Get('usuario/:userId')
  @ApiOperation({ summary: 'Obtener permisos de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Permisos del usuario',
  })
  async getPermisosUsuario(@Param('userId', ParseIntPipe) userId: number) {
    return this.permisosService.obtenerPermisosUsuario(userId);
  }

  @Get('rol/:rolId')
  @ApiOperation({ summary: 'Obtener permisos de un rol' })
  @ApiResponse({
    status: 200,
    description: 'Permisos del rol',
  })
  async getPermisosRol(@Param('rolId', ParseIntPipe) rolId: number) {
    return this.permisosService.obtenerPermisosRol(rolId);
  }

  @Post('rol/:rolId/permiso/:permisoId')
  @ApiOperation({ summary: 'Asignar un permiso a un rol' })
  @ApiResponse({
    status: 201,
    description: 'Permiso asignado correctamente',
  })
  async asignarPermisoARol(
    @Param('rolId', ParseIntPipe) rolId: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
    @Body('condiciones') condiciones?: string,
  ) {
    return this.permisosService.asignarPermisoRol(permisoId, rolId);
  }

  @Delete('rol/:rolId/permiso/:permisoId')
  @ApiOperation({ summary: 'Eliminar un permiso de un rol' })
  @ApiResponse({
    status: 200,
    description: 'Permiso eliminado correctamente',
  })
  async eliminarPermisoDeRol(
    @Param('rolId', ParseIntPipe) rolId: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
  ) {
    return this.permisosService.removerPermisoRol(permisoId, rolId);
  }
}
