import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../email/email.service';
import { SessionService } from './session.service';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';

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
    });

    if (user && (await bcrypt.compare(password, user.contrasena))) {
      const { contrasena, ...result } = user;
      return result;
    }
    return null;
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

  async login(user: any, ip: string, userAgent: string) {
    const payload = { email: user.email, sub: user.id_usuario };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Crear sesión
    await this.sessionService.createSession({
      userId: user.id_usuario,
      token: refreshToken,
      userAgent,
      ipAddress: ip,
      jti: refreshToken,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
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
    await this.sessionService.revokeSession(token, 'logout');
    return { message: 'Sesión cerrada exitosamente' };
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
