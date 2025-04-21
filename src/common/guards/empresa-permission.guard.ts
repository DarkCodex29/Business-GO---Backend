import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  EMPRESA_PERMISSIONS_KEY,
  EmpresaPermissionMetadata,
} from '../decorators/empresa-permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RolEmpresa } from '@prisma/client';

@Injectable()
export class EmpresaPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata =
      this.reflector.getAllAndOverride<EmpresaPermissionMetadata>(
        EMPRESA_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!metadata?.permissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const empresaId = metadata.empresaId ?? request.params.empresaId;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!empresaId) {
      throw new ForbiddenException('ID de empresa no proporcionado');
    }

    // Verificar si el usuario tiene acceso a la empresa
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: user.id_usuario,
        empresa_id: parseInt(empresaId),
        estado: 'activo',
      },
      include: {
        rol_empresa: {
          include: {
            permisos: true,
          },
        },
      },
    });

    if (!usuarioEmpresa || !usuarioEmpresa.rol_empresa) {
      throw new ForbiddenException(
        'No tienes acceso a esta empresa o no tienes un rol asignado',
      );
    }

    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    const hasPermission = metadata.permissions.some((requiredPermission) =>
      (
        usuarioEmpresa.rol_empresa as RolEmpresa & { permisos: any[] }
      ).permisos.some(
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
