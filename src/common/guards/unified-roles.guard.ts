import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleType, ROLES, ROLES_EMPRESA } from '../constants/roles.constant';

// Interfaces para Strategy Pattern
interface IAuthorizationStrategy {
  canAccess(user: any, requiredRoles: RoleType[]): boolean;
}

interface IRoleMapper {
  mapEmpresaRole(empresaRole: string): string | null;
}

// Estrategia para roles globales
@Injectable()
class GlobalRoleStrategy implements IAuthorizationStrategy {
  canAccess(user: any, requiredRoles: RoleType[]): boolean {
    // SUPER_ADMIN tiene acceso total
    if (user.rol === ROLES.SUPER_ADMIN) {
      return true;
    }

    // Verificar rol global del usuario
    return requiredRoles.includes(user.rol);
  }
}

// Estrategia para roles de empresa
@Injectable()
class EmpresaRoleStrategy implements IAuthorizationStrategy {
  constructor(private readonly roleMapper: IRoleMapper) {}

  canAccess(user: any, requiredRoles: RoleType[]): boolean {
    if (!user.empresas || !Array.isArray(user.empresas)) {
      return false;
    }

    const empresaRoles = user.empresas
      .map((empresa: any) => this.roleMapper.mapEmpresaRole(empresa.rol))
      .filter(Boolean);

    return requiredRoles.some((role) => empresaRoles.includes(role));
  }
}

// Mapeador de roles de empresa
@Injectable()
class EmpresaRoleMapper implements IRoleMapper {
  private readonly roleMapping = new Map<string, string>([
    [ROLES_EMPRESA.ADMINISTRADOR, ROLES.EMPRESA_ADMIN],
    [ROLES_EMPRESA.VENDEDOR, ROLES.VENDEDOR],
    [ROLES_EMPRESA.GERENTE, ROLES.EMPRESA_ADMIN],
    [ROLES_EMPRESA.SUPERVISOR, ROLES.VENDEDOR],
    [ROLES_EMPRESA.ALMACEN, ROLES.VENDEDOR],
    [ROLES_EMPRESA.CONTADOR, ROLES.VENDEDOR],
    [ROLES_EMPRESA.RECURSOS_HUMANOS, ROLES.VENDEDOR],
    [ROLES_EMPRESA.AUDITOR, ROLES.VENDEDOR],
    [ROLES_EMPRESA.MARKETING, ROLES.VENDEDOR],
    [ROLES_EMPRESA.SOPORTE, ROLES.VENDEDOR],
    [ROLES_EMPRESA.ANALISTA_DATOS, ROLES.VENDEDOR],
    [ROLES_EMPRESA.GESTOR_LEGAL, ROLES.VENDEDOR],
    [ROLES_EMPRESA.GESTOR_CALIDAD, ROLES.VENDEDOR],
  ]);

  mapEmpresaRole(empresaRole: string): string | null {
    return this.roleMapping.get(empresaRole) || null;
  }
}

// Servicio de autorización que coordina las estrategias
@Injectable()
class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);
  private readonly strategies: IAuthorizationStrategy[];

  constructor(
    private readonly globalStrategy: GlobalRoleStrategy,
    private readonly empresaStrategy: EmpresaRoleStrategy,
  ) {
    this.strategies = [this.globalStrategy, this.empresaStrategy];
  }

  canAccess(user: any, requiredRoles: RoleType[]): boolean {
    try {
      return this.strategies.some((strategy) =>
        strategy.canAccess(user, requiredRoles),
      );
    } catch (error) {
      this.logger.error('Error en verificación de autorización:', error);
      return false;
    }
  }

  logAccessAttempt(
    user: any,
    requiredRoles: RoleType[],
    granted: boolean,
  ): void {
    const level = granted ? 'log' : 'warn';
    const action = granted ? 'Acceso concedido' : 'Acceso denegado';

    this.logger[level](
      `${action} para usuario ${user.id || 'desconocido'} con rol ${user.rol}. Roles requeridos: ${requiredRoles.join(', ')}`,
    );
  }
}

@Injectable()
export class UnifiedRolesGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedRolesGuard.name);
  private readonly authorizationService: AuthorizationService;

  constructor(private readonly reflector: Reflector) {
    // Inicializar servicios de autorización
    const roleMapper = new EmpresaRoleMapper();
    const globalStrategy = new GlobalRoleStrategy();
    const empresaStrategy = new EmpresaRoleStrategy(roleMapper);

    this.authorizationService = new AuthorizationService(
      globalStrategy,
      empresaStrategy,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const hasAccess = this.authorizationService.canAccess(user, requiredRoles);

    // Log del intento de acceso
    this.authorizationService.logAccessAttempt(user, requiredRoles, hasAccess);

    if (!hasAccess) {
      throw new ForbiddenException(
        'No tienes permisos suficientes para acceder a este recurso',
      );
    }

    return true;
  }
}
