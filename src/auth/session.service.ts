import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: number, req: Request, token: string) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const jti = uuidv4(); // Identificador único para el token

    // Crear nueva sesión
    const session = await this.prisma.sesionUsuario.create({
      data: {
        id_usuario: userId,
        token: token,
        dispositivo: userAgent,
        ip_address: ipAddress,
        fecha_expiracion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
      },
    });

    return { session, jti };
  }

  async validateSession(token: string) {
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
  }

  async revokeSession(token: string, reason: string) {
    // Buscar la sesión primero
    const session = await this.prisma.sesionUsuario.findFirst({
      where: {
        token: token,
      },
    });

    if (!session) {
      throw new Error('Sesión no encontrada');
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

    // Registrar el token como revocado
    await this.prisma.tokenRevocado.create({
      data: {
        token_jti: token,
        razon: reason,
        id_usuario: session.id_usuario,
      },
    });
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
      },
      data: {
        ultima_actividad: new Date(),
      },
    });
  }

  async getUserSessions(userId: number) {
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
}
