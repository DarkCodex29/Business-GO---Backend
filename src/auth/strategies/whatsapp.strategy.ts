import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../services/session.service';
import {
  IAuthStrategy,
  AuthCredentials,
  WhatsAppSession,
} from '../interfaces/auth-strategy.interface';
import { Request } from 'express';
import { RoleType, ROLES } from '../../common/constants/roles.constant';
import { v4 as uuidv4 } from 'uuid';
import { EvolutionApiService } from '../../integrations/evolution-api/services/evolution-api.service';

@Injectable()
export class WhatsAppStrategy implements IAuthStrategy {
  readonly type = 'whatsapp';
  private readonly logger = new Logger(WhatsAppStrategy.name);
  private whatsappSessions = new Map<string, WhatsAppSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly evolutionApiService: EvolutionApiService,
  ) {}

  async validate(credentials: AuthCredentials, req?: Request): Promise<any> {
    const { identifier, credential, metadata } = credentials;

    if (metadata?.action === 'initiate') {
      return this.initiateWhatsAppLogin(identifier, metadata.contactName);
    }

    if (metadata?.action === 'verify') {
      return this.verifyWhatsAppLogin(metadata.sessionId, credential!);
    }

    throw new BadRequestException('Acción de WhatsApp no válida');
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
      telefono: user.telefono,
      rol: user.rol.nombre as RoleType,
      empresas: empresaPermissions,
      jti,
      authMethod: 'whatsapp', // Identificar método de autenticación
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
        userAgent: req.headers['user-agent'] || 'WhatsApp Client',
        ipAddress: req.ip || 'WhatsApp',
        jti,
      });
    } else {
      // Fallback para autenticación WhatsApp sin request HTTP
      await this.prisma.sesionUsuario.create({
        data: {
          id_usuario: user.id_usuario,
          token: accessToken,
          dispositivo: 'WhatsApp',
          fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
      });
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async initiateWhatsAppLogin(
    phoneNumber: string,
    contactName?: string,
  ): Promise<{
    sessionId: string;
    message: string;
    requiresVerification: boolean;
  }> {
    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = `wa_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    // Guardar sesión temporal
    this.whatsappSessions.set(sessionId, {
      sessionId,
      phoneNumber,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      metadata: { contactName },
    });

    // Enviar código vía Evolution API
    try {
      await this.sendWhatsAppCode(phoneNumber, code);
      this.logger.log(
        `Código WhatsApp enviado a ${phoneNumber} vía Evolution API`,
      );
    } catch (error) {
      this.logger.error(`Error enviando código WhatsApp: ${error.message}`);
      // En caso de error, mostrar código en consola como fallback
      console.log(`🔐 Código WhatsApp FALLBACK para ${phoneNumber}: ${code}`);
    }

    return {
      sessionId,
      message: `Código de verificación enviado a ${phoneNumber}`,
      requiresVerification: true,
    };
  }

  private async verifyWhatsAppLogin(
    sessionId: string,
    code: string,
  ): Promise<any> {
    const session = this.whatsappSessions.get(sessionId);

    if (!session) {
      throw new UnauthorizedException(
        'Sesión de verificación no encontrada o expirada',
      );
    }

    if (new Date() > session.expiresAt) {
      this.whatsappSessions.delete(sessionId);
      throw new UnauthorizedException('Código de verificación expirado');
    }

    if (session.attempts >= 3) {
      this.whatsappSessions.delete(sessionId);
      throw new UnauthorizedException('Demasiados intentos fallidos');
    }

    if (session.code !== code) {
      session.attempts++;
      throw new UnauthorizedException('Código de verificación incorrecto');
    }

    // Código correcto, buscar o crear usuario
    let user = await this.findOrCreateUserByPhone(
      session.phoneNumber,
      session.metadata?.contactName,
    );

    // Limpiar sesión temporal
    this.whatsappSessions.delete(sessionId);

    return user;
  }

  private async findOrCreateUserByPhone(
    phoneNumber: string,
    contactName?: string,
  ): Promise<any> {
    // Buscar usuario existente por teléfono
    let user = await this.prisma.usuario.findFirst({
      where: { telefono: phoneNumber },
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
      // Crear nuevo usuario cliente
      const clienteRole = await this.prisma.rol.findFirst({
        where: { nombre: ROLES.CLIENTE },
      });

      if (!clienteRole) {
        throw new BadRequestException('Rol de cliente no encontrado');
      }

      user = await this.prisma.usuario.create({
        data: {
          nombre: contactName || `Usuario ${phoneNumber}`,
          email: `${phoneNumber.replace('+', '')}@whatsapp.temp`, // Email temporal
          telefono: phoneNumber,
          contrasena: 'whatsapp_auth', // Password temporal
          rol_id: clienteRole.id_rol,
          telefono_verificado: true, // Ya verificado por WhatsApp
        },
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

      // Crear perfil de cliente
      if (user) {
        await this.prisma.cliente.create({
          data: {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
            telefono: user.telefono,
          },
        });
      }
    }

    return user;
  }

  // Método para limpiar sesiones expiradas (llamar periódicamente)
  public cleanExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.whatsappSessions.entries()) {
      if (now > session.expiresAt) {
        this.whatsappSessions.delete(sessionId);
      }
    }
  }

  /**
   * Envía código de verificación vía Evolution API
   */
  private async sendWhatsAppCode(
    phoneNumber: string,
    code: string,
  ): Promise<void> {
    try {
      // Buscar instancia Evolution API disponible
      // Por ahora usar instancia por defecto, luego se puede mejorar
      const defaultInstance = await this.prisma.evolutionInstance.findFirst({
        where: {
          estado_conexion: 'conectado',
        },
        orderBy: {
          fecha_creacion: 'desc',
        },
      });

      if (!defaultInstance) {
        throw new Error(
          'No hay instancias Evolution API conectadas disponibles',
        );
      }

      // Formatear mensaje de código
      const mensaje = `🔐 *Código de verificación BusinessGo*\n\nTu código es: *${code}*\n\nEste código expira en 5 minutos.\n\n_Si no solicitaste este código, ignora este mensaje._`;

      // Enviar mensaje vía Evolution API
      const resultado = await this.evolutionApiService.sendTextMessage(
        defaultInstance.instance_name,
        phoneNumber,
        mensaje,
      );

      if (!resultado.success) {
        throw new Error(`Error Evolution API: ${resultado.error}`);
      }

      this.logger.log(
        `Código enviado exitosamente vía Evolution API a ${phoneNumber}`,
      );
    } catch (error) {
      this.logger.error(`Error enviando código WhatsApp: ${error.message}`);
      throw error;
    }
  }
}
