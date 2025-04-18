import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { SessionService } from './session.service';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
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

  async login(email: string, password: string, req: Request) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user, req);
    return {
      user,
      ...tokens,
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
    return this.usersService.findOne(userId.toString());
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const tokens = await this.generateTokens(user, {} as Request);
      return tokens;
    } catch {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }
}
