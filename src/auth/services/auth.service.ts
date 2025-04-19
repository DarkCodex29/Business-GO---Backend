import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../email/email.service';
import { SessionService } from './session.service';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
        empresas: {
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
    const user = await this.usersService.create(registerDto);
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

    const payload = {
      sub: user.id_usuario,
      email: user.email,
      rol: {
        id: user.rol.id_rol,
        nombre: user.rol.nombre,
      },
      empresas: user.empresas.map((empresa) => ({
        id: empresa.empresa_id,
        rol: empresa.rol_empresa
          ? {
              id: empresa.rol_empresa.id_rol,
              nombre: empresa.rol_empresa.nombre,
              permisos: empresa.rol_empresa.permisos.map((permiso) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
              })),
            }
          : null,
      })),
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
        nombre: user.nombre,
        rol: user.rol.nombre,
        empresas: user.empresas.map((empresa) => ({
          id: empresa.empresa_id,
          rol: empresa.rol_empresa?.nombre,
        })),
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
    await this.prisma.tokenRevocado.create({
      data: {
        token_jti: token,
        id_usuario: 0, // Se actualizará con el ID real del usuario
      },
    });

    // Eliminar la sesión
    await this.prisma.sesionUsuario.deleteMany({
      where: { token },
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
    return this.usersService.findOne(userId);
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
}
