import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../services/session.service';
import {
  IAuthStrategy,
  AuthCredentials,
} from '../interfaces/auth-strategy.interface';
import { Request } from 'express';
import { RoleType } from '../../common/constants/roles.constant';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailPasswordStrategy implements IAuthStrategy {
  readonly type = 'email';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async validate(credentials: AuthCredentials, req?: Request): Promise<any> {
    const { identifier, credential } = credentials;

    if (!credential) {
      throw new UnauthorizedException('Password requerido');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { email: identifier },
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

    const isPasswordValid = await bcrypt.compare(credential, user.contrasena);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  async generateTokens(
    user: any,
    req?: Request,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
  }> {
    // Preparar los permisos de empresa para el token
    const empresaPermissions =
      user.empresas
        ?.filter((empresa: any) => empresa.rol_empresa !== null)
        .map((empresa: any) => ({
          empresaId: empresa.empresa_id,
          rol: empresa.rol_empresa!.nombre,
          permisos: empresa.rol_empresa!.permisos.map((permiso: any) => ({
            recurso: permiso.recurso,
            accion: permiso.accion,
          })),
        })) || [];

    const jti = uuidv4();
    const payload = {
      sub: user.id_usuario,
      email: user.email,
      rol: user.rol.nombre as RoleType,
      empresas: empresaPermissions,
      jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    // Crear sesión usando el SessionService existente
    if (req) {
      await this.sessionService.createSession({
        userId: user.id_usuario,
        token: accessToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        jti,
      });
    } else {
      // Fallback para cuando no hay request (ej: refresh token)
      await this.prisma.sesionUsuario.create({
        data: {
          id_usuario: user.id_usuario,
          token: accessToken,
          fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
      });
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
