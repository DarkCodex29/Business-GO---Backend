import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISOS_KEY,
  PermisoRequerido,
} from '../decorators/permisos.decorator';
import { PermisosService } from '../../auth/services/permisos.service';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permisosService: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permisoRequerido = this.reflector.getAllAndOverride<PermisoRequerido>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permisoRequerido) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const tienePermiso = await this.permisosService.verificarPermisoUsuario(
      usuario.id_usuario,
      permisoRequerido.recurso,
      permisoRequerido.accion,
    );

    if (!tienePermiso) {
      throw new ForbiddenException(
        `No tiene permiso para ${permisoRequerido.accion} en ${permisoRequerido.recurso}`,
      );
    }

    return true;
  }
}
