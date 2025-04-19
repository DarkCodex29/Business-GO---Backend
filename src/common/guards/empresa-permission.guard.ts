import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EMPRESA_PERMISSIONS_KEY } from '../decorators/empresa-permissions.decorator';

@Injectable()
export class EmpresaPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      EMPRESA_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const empresaId = request.params.empresaId;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!empresaId) {
      throw new ForbiddenException('ID de empresa no proporcionado');
    }

    // Verificar si el usuario tiene acceso a la empresa
    const empresaAccess = user.empresas?.find(
      (emp) => emp.id_empresa === parseInt(empresaId),
    );

    if (!empresaAccess) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    const hasPermission = requiredPermissions.some((requiredPermission) =>
      empresaAccess.rol_empresa?.permisos?.some(
        (permiso) =>
          permiso.recurso === requiredPermission.split('.')[0] &&
          permiso.accion === requiredPermission.split('.')[1],
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
