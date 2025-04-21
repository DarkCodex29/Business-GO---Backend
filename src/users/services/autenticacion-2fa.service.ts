import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { authenticator } from 'otplib';
import { Autenticacion2FADto } from '../dto/autenticacion-2fa.dto';

@Injectable()
export class Autenticacion2FAService {
  constructor(private readonly prisma: PrismaService) {}

  async configurar2FA(dto: Autenticacion2FADto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: dto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya existe una configuración 2FA
    const existing2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: dto.id_usuario },
    });

    if (existing2FA) {
      throw new BadRequestException(
        'La autenticación 2FA ya está configurada para este usuario',
      );
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(usuario.email, 'BusinessGo', secret);

    // Crear la configuración 2FA
    await this.prisma.autenticacion2FA.create({
      data: {
        id_usuario: dto.id_usuario,
        codigo_verificacion: secret,
        fecha_expiracion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
        estado: 'ACTIVO',
      },
    });

    return {
      otpauth,
      secret,
    };
  }

  async desactivar2FA(dto: Autenticacion2FADto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: dto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const config2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: dto.id_usuario },
    });

    if (!config2FA) {
      throw new BadRequestException(
        'La autenticación 2FA no está configurada para este usuario',
      );
    }

    // Eliminar la configuración 2FA
    await this.prisma.autenticacion2FA.delete({
      where: { id_usuario: dto.id_usuario },
    });

    return { message: 'Autenticación 2FA desactivada correctamente' };
  }

  async verificarCodigo2FA(dto: Autenticacion2FADto) {
    if (!dto.codigo) {
      throw new BadRequestException('El código 2FA es requerido');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: dto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const config2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: dto.id_usuario },
    });

    if (!config2FA) {
      throw new BadRequestException(
        'La autenticación 2FA no está configurada para este usuario',
      );
    }

    if (config2FA.estado !== 'ACTIVO') {
      throw new BadRequestException('2FA no está activo para este usuario');
    }

    if (new Date() > config2FA.fecha_expiracion) {
      throw new BadRequestException('El código 2FA ha expirado');
    }

    const esValido = authenticator.verify({
      token: dto.codigo,
      secret: config2FA.codigo_verificacion,
    });

    if (!esValido) {
      throw new BadRequestException('Código 2FA inválido');
    }

    return { message: 'Código 2FA verificado correctamente' };
  }
}
