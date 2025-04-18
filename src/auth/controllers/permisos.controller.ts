import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermisosService } from '../services/permisos.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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
  async getPermisosUsuario(@Param('userId') userId: string) {
    return this.permisosService.obtenerPermisosUsuario(BigInt(userId));
  }

  @Get('rol/:rolId')
  @ApiOperation({ summary: 'Obtener permisos de un rol' })
  @ApiResponse({
    status: 200,
    description: 'Permisos del rol',
  })
  async getPermisosRol(@Param('rolId') rolId: string) {
    return this.permisosService.obtenerPermisosRol(Number(rolId));
  }

  @Post('rol/:rolId/permiso/:permisoId')
  @ApiOperation({ summary: 'Asignar un permiso a un rol' })
  @ApiResponse({
    status: 201,
    description: 'Permiso asignado correctamente',
  })
  async asignarPermisoARol(
    @Param('rolId') rolId: string,
    @Param('permisoId') permisoId: string,
    @Body('condiciones') condiciones?: string,
  ) {
    return this.permisosService.asignarPermisoARol(
      Number(rolId),
      Number(permisoId),
      condiciones,
    );
  }

  @Delete('rol/:rolId/permiso/:permisoId')
  @ApiOperation({ summary: 'Eliminar un permiso de un rol' })
  @ApiResponse({
    status: 200,
    description: 'Permiso eliminado correctamente',
  })
  async eliminarPermisoDeRol(
    @Param('rolId') rolId: string,
    @Param('permisoId') permisoId: string,
  ) {
    return this.permisosService.eliminarPermisoDeRol(
      Number(rolId),
      Number(permisoId),
    );
  }
}
