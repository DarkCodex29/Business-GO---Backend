import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EmpresaPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const empresaAccess = request.empresaAccess;

    if (!empresaAccess) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    const hasPermission = empresaAccess.roles.some((rol) =>
      rol.permisos.some((permiso) =>
        requiredPermissions.includes(permiso.nombre),
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tienes los permisos necesarios para realizar esta acción',
      );
    }

    return true;
  }
}
