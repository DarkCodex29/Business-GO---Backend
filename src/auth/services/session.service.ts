import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

interface CreateSessionDto {
  userId: number;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  jti: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createSession(data: CreateSessionDto) {
    try {
      // Crear nueva sesión
      const session = await this.prisma.sesionUsuario.create({
        data: {
          id_usuario: data.userId,
          token: data.token,
          dispositivo: data.userAgent,
          ip_address: data.ipAddress,
          fecha_expiracion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
          activa: true,
        },
      });

      this.logger.log(`Sesión creada para usuario ${data.userId}`);
      return { session, jti: data.jti };
    } catch (error) {
      this.logger.error(`Error creando sesión para usuario ${data.userId}:`, error);
      throw new InternalServerErrorException('Error al crear sesión');
    }
  }

  async validateSession(token: string) {
    try {
      const session = await this.prisma.sesionUsuario.findFirst({
        where: {
          token: token,
          activa: true,
          fecha_expiracion: {
            gt: new Date(),
          },
        },
      });

      return session;
    } catch (error) {
      this.logger.error('Error validando sesión:', error);
      return null;
    }
  }

  async revokeSession(token: string, reason: string = 'logout') {
    try {
      // Buscar la sesión primero
      const session = await this.prisma.sesionUsuario.findFirst({
        where: {
          token: token,
        },
      });

      if (!session) {
        this.logger.warn(`Intento de revocar sesión inexistente: ${token.substring(0, 20)}...`);
        return; // Si no existe la sesión, no hacemos nada
      }

      // Desactivar la sesión
      await this.prisma.sesionUsuario.updateMany({
        where: {
          token: token,
        },
        data: {
          activa: false,
        },
      });

      // Obtener el jti del token
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded?.jti) {
        this.logger.warn('Token sin JTI, no se puede registrar como revocado');
        return;
      }

      // Registrar el token como revocado
      await this.prisma.tokenRevocado.create({
        data: {
          token_jti: decoded.jti,
          razon: reason,
          id_usuario: session.id_usuario,
        },
      });

      this.logger.log(`Sesión revocada para usuario ${session.id_usuario}, razón: ${reason}`);
    } catch (error) {
      this.logger.error('Error revocando sesión:', error);
      throw new InternalServerErrorException('Error al revocar sesión');
    }
  }

  async revokeAllUserSessions(userId: number, exceptToken?: string) {
    // Desactivar todas las sesiones del usuario excepto la actual
    await this.prisma.sesionUsuario.updateMany({
      where: {
        id_usuario: userId,
        token: {
          not: exceptToken,
        },
      },
      data: {
        activa: false,
      },
    });
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const revokedToken = await this.prisma.tokenRevocado.findUnique({
      where: {
        token_jti: jti,
      },
    });

    return !!revokedToken;
  }

  async updateLastActivity(token: string) {
    await this.prisma.sesionUsuario.updateMany({
      where: {
        token: token,
        activa: true,
      },
      data: {
        ultima_actividad: new Date(),
      },
    });
  }

  async getUserSessions(userId: number) {
    const sessions = await this.prisma.sesionUsuario.findMany({
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
        fecha_expiracion: true,
      },
    });

    return sessions;
  }
}
