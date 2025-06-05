import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface TwoFactorConfig {
  empresaId: number;
  userId: number;
  method: '2FA_APP' | '2FA_EMAIL' | '2FA_SMS' | '2FA_WHATSAPP';
  isEnabled: boolean;
  backupCodes?: string[];
  secret?: string;
  phoneNumber?: string;
}

export interface TwoFactorVerification {
  verified: boolean;
  remainingAttempts: number;
  nextAttemptAllowed?: Date;
}

@Injectable()
export class Enhanced2FAService {
  private readonly logger = new Logger(Enhanced2FAService.name);
  private readonly verificationAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    authenticator.options = {
      window: 2,
      step: 30,
    };
  }

  /**
   * Habilita 2FA para un usuario en una empresa específica
   */
  async enable2FA(
    userId: number,
    empresaId: number,
    method: TwoFactorConfig['method'],
    phoneNumber?: string,
  ): Promise<{ secret?: string; qrCode?: string; backupCodes: string[] }> {
    // Por ahora, usamos el modelo simplificado existente
    const backupCodes = this.generateBackupCodes();
    let secret: string | undefined;

    if (method === '2FA_APP') {
      secret = authenticator.generateSecret();
    }

    // Usar el modelo actual simplificado
    await this.prisma.autenticacion2FA.upsert({
      where: {
        id_usuario: userId,
      },
      update: {
        codigo_verificacion: secret || this.generateTemporaryCodeSync(),
        fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        estado: 'activo',
      },
      create: {
        id_usuario: userId,
        codigo_verificacion: secret || this.generateTemporaryCodeSync(),
        fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000),
        estado: 'activo',
      },
    });

    this.logger.log(
      `2FA habilitado para usuario ${userId} con método ${method}`,
    );

    return {
      secret,
      backupCodes,
    };
  }

  /**
   * Deshabilita 2FA para un usuario en una empresa
   */
  async disable2FA(userId: number, empresaId: number): Promise<void> {
    await this.prisma.autenticacion2FA.update({
      where: {
        id_usuario: userId,
      },
      data: {
        estado: 'inactivo',
      },
    });

    this.logger.log(`2FA deshabilitado para usuario ${userId}`);
  }

  /**
   * Verifica un código 2FA
   */
  async verifyCode(
    userId: number,
    empresaId: number,
    code: string,
    isBackupCode: boolean = false,
  ): Promise<TwoFactorVerification> {
    const attemptKey = `${userId}_${empresaId}`;
    const attempts = this.verificationAttempts.get(attemptKey);

    if (attempts && attempts.count >= 5) {
      const timeDiff = Date.now() - attempts.lastAttempt.getTime();
      if (timeDiff < 15 * 60 * 1000) {
        throw new UnauthorizedException(
          'Demasiados intentos fallidos. Intente más tarde.',
        );
      } else {
        this.verificationAttempts.delete(attemptKey);
      }
    }

    const config = await this.get2FAConfig(userId, empresaId);
    if (!config.isEnabled) {
      throw new BadRequestException('2FA no está habilitado');
    }

    // Verificación simplificada
    let verified = false;
    if (config.secret) {
      verified = this.verifyTOTPCode(config.secret, code);
    }

    if (verified) {
      this.verificationAttempts.delete(attemptKey);
    } else {
      const currentAttempts = attempts || { count: 0, lastAttempt: new Date() };
      currentAttempts.count += 1;
      currentAttempts.lastAttempt = new Date();
      this.verificationAttempts.set(attemptKey, currentAttempts);
    }

    const currentAttempts = this.verificationAttempts.get(attemptKey);
    const remainingAttempts = Math.max(0, 5 - (currentAttempts?.count || 0));

    return {
      verified,
      remainingAttempts,
      nextAttemptAllowed:
        currentAttempts && currentAttempts.count >= 5
          ? new Date(currentAttempts.lastAttempt.getTime() + 15 * 60 * 1000)
          : undefined,
    };
  }

  /**
   * Obtiene la configuración 2FA de un usuario para una empresa
   */
  async get2FAConfig(
    userId: number,
    empresaId: number,
  ): Promise<TwoFactorConfig> {
    const config = await this.prisma.autenticacion2FA.findUnique({
      where: {
        id_usuario: userId,
      },
    });

    if (!config || config.estado !== 'activo') {
      return {
        empresaId,
        userId,
        method: '2FA_EMAIL',
        isEnabled: false,
      };
    }

    return {
      empresaId,
      userId,
      method: '2FA_APP', // Por defecto
      isEnabled: true,
      secret: config.codigo_verificacion,
    };
  }

  /**
   * Regenera códigos de respaldo
   */
  async regenerateBackupCodes(
    userId: number,
    empresaId: number,
  ): Promise<string[]> {
    const newBackupCodes = this.generateBackupCodes();

    // En el modelo simplificado, guardamos en metadatos como JSON
    await this.prisma.autenticacion2FA.update({
      where: {
        id_usuario: userId,
      },
      data: {
        // Usamos el campo existente para guardar información adicional
        codigo_verificacion: JSON.stringify({
          secret: await this.get2FAConfig(userId, empresaId).then(
            (c) => c.secret,
          ),
          backupCodes: newBackupCodes,
        }),
      },
    });

    this.logger.log(`Códigos de respaldo regenerados para usuario ${userId}`);
    return newBackupCodes;
  }

  // Métodos privados simplificados
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  private generateTemporaryCodeSync(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch (error) {
      return false;
    }
  }
}
