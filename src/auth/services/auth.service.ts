import { Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly usuariosService: UsuariosService,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

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
    await this.emailService.sendWelcomeEmail(user.email, user.nombre);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Preparar los permisos de empresa para el token
    const empresaPermissions = user.empresas
      .filter((empresa) => empresa.rol_empresa !== null)
      .map((empresa) => ({
        empresaId: empresa.empresa_id,
        rol: empresa.rol_empresa!.nombre,
        permisos: empresa.rol_empresa!.permisos.map((permiso) => ({
          recurso: permiso.recurso,
          accion: permiso.accion,
        })),
      }));

    const payload = {
      sub: user.id_usuario,
      email: user.email,
      rol: user.rol.nombre as RoleType,
      empresas: empresaPermissions,
    };

    const token = this.jwtService.sign(payload);

    // Registrar la sesión
    await this.prisma.sesionUsuario.create({
      data: {
        id_usuario: user.id_usuario,
        token,
        fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    return {
      access_token: token,
      user: {
        id: user.id_usuario,
        email: user.email,
        rol: user.rol.nombre,
        empresas: empresaPermissions,
      },
    };
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
}
