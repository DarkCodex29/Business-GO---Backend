import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SessionService } from './session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
  ) {}

  async register(registerDto: RegisterDto, req: Request) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    try {
      // Crear el usuario
      const user = await this.prisma.usuario.create({
        data: {
          nombre: registerDto.nombre,
          email: registerDto.email,
          contrasena: hashedPassword,
          telefono: registerDto.telefono,
          rol: {
            connect: {
              id_rol: registerDto.rolId,
            },
          },
        },
        include: {
          rol: true,
        },
      });

      // Enviar email de bienvenida
      await this.emailService.sendWelcomeEmail(user.email, user.nombre);

      // Generar tokens
      const tokens = await this.generateTokens(user);

      // Crear sesión
      await this.createSession(user.id_usuario, tokens.accessToken, req);

      // Excluir la contraseña y convertir BigInt a string
      const { contrasena, ...userData } = user;
      const userResponse = {
        ...userData,
        id_usuario: userData.id_usuario.toString(),
      };

      return {
        user: userResponse,
        ...tokens,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto, req: Request) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: loginDto.email },
      include: {
        rol: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.contrasena,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Crear sesión
    await this.createSession(user.id_usuario, tokens.accessToken, req);

    // Excluir la contraseña y convertir BigInt a string
    const { contrasena, ...userData } = user;
    const userResponse = {
      ...userData,
      id_usuario: userData.id_usuario.toString(),
    };

    return {
      user: userResponse,
      ...tokens,
    };
  }

  private async generateTokens(user: any) {
    const jti = uuidv4(); // Generar ID único para el token

    const payload = {
      sub: user.id_usuario.toString(),
      email: user.email,
      role: user.rol.nombre,
      jti,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(userId: bigint, token: string, req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    return this.prisma.sesionUsuario.create({
      data: {
        usuario: {
          connect: {
            id_usuario: userId,
          },
        },
        token,
        dispositivo: userAgent,
        ip_address: ip,
        fecha_expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });
  }

  async logout(token: string) {
    const session = await this.prisma.sesionUsuario.findUnique({
      where: { token },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    await this.prisma.sesionUsuario.update({
      where: { id_sesion: session.id_sesion },
      data: { activa: false },
    });

    await this.prisma.tokenRevocado.create({
      data: {
        token_jti: token,
        razon: 'logout',
        usuario: {
          connect: {
            id_usuario: session.id_usuario,
          },
        },
      },
    });

    return { message: 'Sesión cerrada exitosamente' };
  }

  async logoutAllSessions(userId: bigint, currentToken: string) {
    await this.prisma.sesionUsuario.updateMany({
      where: {
        id_usuario: userId,
        token: { not: currentToken },
        activa: true,
      },
      data: { activa: false },
    });

    return { message: 'Todas las sesiones han sido cerradas exitosamente' };
  }

  async getUserSessions(userId: bigint) {
    return this.prisma.sesionUsuario.findMany({
      where: {
        id_usuario: userId,
        activa: true,
      },
      select: {
        id_sesion: true,
        dispositivo: true,
        ip_address: true,
        ultima_actividad: true,
        fecha_creacion: true,
      },
    });
  }

  async getProfile(userId: bigint) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: {
          select: {
            id_rol: true,
            nombre: true,
          },
        },
        // No incluimos cliente y empresa a menos que sean necesarios
        sesiones: {
          where: { activa: true },
          select: {
            id_sesion: true,
            dispositivo: true,
            ultima_actividad: true,
            fecha_creacion: true,
          },
          orderBy: {
            ultima_actividad: 'desc',
          },
          take: 5, // Limitamos a las últimas 5 sesiones
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...user,
      id_usuario: user.id_usuario.toString(),
      sesiones: user.sesiones.map((sesion) => ({
        ...sesion,
        id_sesion: sesion.id_sesion.toString(),
      })),
    };
  }
}
