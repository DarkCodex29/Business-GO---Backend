import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { authenticator } from 'otplib';
import { RolesPredefinidosConfig } from '../../common/config/roles-predefinidos.config';

@Injectable()
export class Autenticacion2FAService {
  constructor(private readonly prisma: PrismaService) {}

  async generarCodigo2FA(usuarioId: number): Promise<string> {
    // Verificar que el usuario es SUPER_ADMIN
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: { rol: true },
    });

    if (
      !usuario ||
      usuario.rol.nombre !==
        RolesPredefinidosConfig.ROLES_GLOBALES.SUPER_ADMIN.nombre
    ) {
      throw new UnauthorizedException('Solo los SUPER_ADMIN pueden usar 2FA');
    }

    // Generar código secreto
    const secret = authenticator.generateSecret();

    // Generar código de verificación
    const codigo = authenticator.generate(secret);

    // Guardar en la base de datos
    await this.prisma.autenticacion2FA.upsert({
      where: { id_usuario: usuarioId },
      update: {
        codigo_verificacion: secret,
        fecha_expiracion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
        estado: 'PENDIENTE',
      },
      create: {
        id_usuario: usuarioId,
        codigo_verificacion: secret,
        fecha_expiracion: new Date(Date.now() + 5 * 60 * 1000),
        estado: 'PENDIENTE',
      },
    });

    return codigo;
  }

  async verificarCodigo2FA(
    usuarioId: number,
    codigo: string,
  ): Promise<boolean> {
    const autenticacion2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: usuarioId },
    });

    if (!autenticacion2FA) {
      throw new UnauthorizedException(
        'No se encontró autenticación 2FA para este usuario',
      );
    }

    if (autenticacion2FA.estado !== 'PENDIENTE') {
      throw new UnauthorizedException('El código ya fue utilizado o expiró');
    }

    if (new Date() > autenticacion2FA.fecha_expiracion) {
      await this.prisma.autenticacion2FA.update({
        where: { id_usuario: usuarioId },
        data: { estado: 'EXPIRADO' },
      });
      throw new UnauthorizedException('El código ha expirado');
    }

    const esValido = authenticator.verify({
      token: codigo,
      secret: autenticacion2FA.codigo_verificacion,
    });

    if (esValido) {
      await this.prisma.autenticacion2FA.update({
        where: { id_usuario: usuarioId },
        data: { estado: 'VERIFICADO' },
      });
    }

    return esValido;
  }

  async desactivar2FA(usuarioId: number): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: { rol: true },
    });

    if (
      !usuario ||
      usuario.rol.nombre !==
        RolesPredefinidosConfig.ROLES_GLOBALES.SUPER_ADMIN.nombre
    ) {
      throw new UnauthorizedException(
        'Solo los SUPER_ADMIN pueden desactivar 2FA',
      );
    }

    await this.prisma.autenticacion2FA.delete({
      where: { id_usuario: usuarioId },
    });
  }

  async obtenerEstado2FA(usuarioId: number): Promise<string> {
    const autenticacion2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: usuarioId },
    });

    return autenticacion2FA?.estado ?? 'NO_CONFIGURADO';
  }
}
