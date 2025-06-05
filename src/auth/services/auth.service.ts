import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../email/email.service';
import { SessionService } from './session.service';
import { Request } from 'express';
import { UsuariosService } from '../../users/services/usuarios.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RolesService } from '../../roles/services/roles.service';
import * as bcrypt from 'bcrypt';
import { RoleType, ROLES } from '../../common/constants/roles.constant';
import {
  IAuthStrategy,
  AuthCredentials,
  AuthResult,
} from '../interfaces/auth-strategy.interface';
import { EmailPasswordStrategy } from '../strategies/email-password.strategy';
import { WhatsAppStrategy } from '../strategies/whatsapp.strategy';

@Injectable()
export class AuthService {
  private strategies = new Map<string, IAuthStrategy>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly usuariosService: UsuariosService,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly emailPasswordStrategy: EmailPasswordStrategy,
    private readonly whatsAppStrategy: WhatsAppStrategy,
  ) {
    // Registrar estrategias
    this.strategies.set('email', this.emailPasswordStrategy);
    this.strategies.set('whatsapp', this.whatsAppStrategy);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
        empresas: {
          where: { estado: 'activo' },
          include: {
            rol_empresa: {
              include: {
                permisos: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.contrasena);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  async register(registerDto: any, req: Request) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const userData = { ...registerDto, password: hashedPassword };

    const user = await this.usuariosService.create(userData);
    const tokens = await this.generateTokens(user, req);

    // Enviar email de bienvenida
    const empresaId =
      user.empresas && user.empresas.length > 0
        ? user.empresas[0].empresa_id.toString()
        : 'default';

    await this.emailService.sendWelcomeEmail(
      user.email,
      { nombre: user.nombre },
      empresaId,
    );

    return {
      user,
      ...tokens,
    };
  }

  // Método principal de autenticación multi-canal
  async authenticate(
    credentials: AuthCredentials,
    req?: Request,
  ): Promise<AuthResult> {
    const strategy = this.strategies.get(credentials.type);

    if (!strategy) {
      throw new BadRequestException(
        `Método de autenticación '${credentials.type}' no soportado`,
      );
    }

    const result = await strategy.validate(credentials, req);

    // Si es una respuesta de verificación (WhatsApp initiate), retornarla directamente
    if (result.requiresVerification) {
      return result;
    }

    // Si es un usuario válido, generar tokens
    const tokens = await strategy.generateTokens(result, req);

    return {
      user: {
        id: result.id_usuario,
        email: result.email,
        telefono: result.telefono,
        rol: result.rol.nombre,
        empresas:
          result.empresas?.map((empresa: any) => ({
            empresaId: empresa.empresa_id,
            rol: empresa.rol_empresa?.nombre,
            permisos:
              empresa.rol_empresa?.permisos?.map((permiso: any) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
              })) || [],
          })) || [],
      },
      tokens,
    };
  }

  // Mantener método login original para compatibilidad
  async login(loginDto: LoginDto, req?: Request) {
    const credentials: AuthCredentials = {
      type: 'email',
      identifier: loginDto.email,
      credential: loginDto.password,
    };

    return this.authenticate(credentials, req);
  }

  private async generateTokens(user: any, req: Request) {
    const jti = uuidv4();
    const payload = {
      sub: user.id_usuario.toString(),
      email: user.email,
      rol: user.rol?.nombre,
      jti: jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    // Crear sesión
    await this.sessionService.createSession({
      userId: Number(user.id_usuario),
      token: accessToken,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      jti: jti,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(token: string) {
    // Revocar el token
    await this.prisma.sesionUsuario.updateMany({
      where: { token },
      data: { fecha_expiracion: new Date() },
    });
  }

  async logoutAllSessions(userId: number, currentToken: string) {
    await this.sessionService.revokeAllUserSessions(userId, currentToken);
    return { message: 'Todas las sesiones han sido cerradas' };
  }

  async getUserSessions(userId: number) {
    return this.sessionService.getUserSessions(userId);
  }

  async getProfile(userId: number) {
    return this.usuariosService.findOne(userId);
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.usuario.findUnique({
        where: { id_usuario: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException();
      }

      const newPayload = { email: user.email, sub: user.id_usuario };
      return {
        access_token: this.jwtService.sign(newPayload),
      };
    } catch {
      throw new UnauthorizedException();
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const sesion = await this.prisma.sesionUsuario.findFirst({
        where: {
          token,
          fecha_expiracion: { gt: new Date() },
        },
      });

      if (!sesion) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      return payload;
    } catch (error) {
      console.error('Error al validar token:', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async isAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: { rol: true },
    });

    return (
      user?.rol.nombre === ROLES.ADMIN || user?.rol.nombre === ROLES.SUPER_ADMIN
    );
  }

  async hasEmpresaPermission(
    userId: number,
    empresaId: number,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: userId,
        empresa_id: empresaId,
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

    if (!usuarioEmpresa?.rol_empresa) {
      return false;
    }

    return requiredPermissions.some((requiredPermission) =>
      usuarioEmpresa.rol_empresa!.permisos.some(
        (permiso) =>
          permiso.recurso === requiredPermission.split(':')[0] &&
          permiso.accion === requiredPermission.split(':')[1],
      ),
    );
  }

  // Métodos agregados para JWT Strategy
  async isTokenRevoked(jti: string): Promise<boolean> {
    return this.sessionService.isTokenRevoked(jti);
  }

  async validateTokenPayload(payload: any) {
    try {
      const user = await this.prisma.usuario.findUnique({
        where: {
          id_usuario: payload.sub,
          activo: true, // Solo usuarios activos
        },
        include: {
          rol: true,
          empresas: {
            where: { estado: 'activo' },
            include: {
              rol_empresa: {
                include: {
                  permisos: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Formatear respuesta consistente
      return {
        id_usuario: user.id_usuario,
        email: user.email,
        telefono: user.telefono,
        rol: user.rol.nombre,
        empresas:
          user.empresas?.map((empresa: any) => ({
            empresaId: empresa.empresa_id,
            rol: empresa.rol_empresa?.nombre,
            permisos:
              empresa.rol_empresa?.permisos?.map((permiso: any) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
              })) || [],
          })) || [],
      };
    } catch (error) {
      console.error('Error validating token payload:', error);
      return null;
    }
  }
}
