import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AuthSession {
  telefono: string;
  codigo: string;
  intentos: number;
  expira: Date;
  verificado: boolean;
  empresaId?: number;
}

@Injectable()
export class EvolutionAuthService {
  private authSessions = new Map<string, AuthSession>();
  private readonly CODIGO_EXPIRACION_MINUTOS = 10;
  private readonly MAX_INTENTOS = 3;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera un código de verificación para el empresario
   */
  async generarCodigoVerificacion(telefono: string): Promise<string> {
    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    // Crear sesión de autenticación
    const expira = new Date();
    expira.setMinutes(expira.getMinutes() + this.CODIGO_EXPIRACION_MINUTOS);

    this.authSessions.set(telefono, {
      telefono,
      codigo,
      intentos: 0,
      expira,
      verificado: false,
    });

    return codigo;
  }

  /**
   * Valida el código de verificación ingresado
   */
  async validarCodigo(
    telefono: string,
    codigoIngresado: string,
  ): Promise<boolean> {
    const session = this.authSessions.get(telefono);

    if (!session) {
      throw new UnauthorizedException('No hay sesión de autenticación activa');
    }

    if (new Date() > session.expira) {
      this.authSessions.delete(telefono);
      throw new UnauthorizedException('El código ha expirado');
    }

    if (session.intentos >= this.MAX_INTENTOS) {
      this.authSessions.delete(telefono);
      throw new UnauthorizedException('Máximo de intentos alcanzado');
    }

    session.intentos++;

    if (session.codigo === codigoIngresado) {
      session.verificado = true;
      // Extender la sesión por 1 hora después de verificar
      session.expira = new Date();
      session.expira.setHours(session.expira.getHours() + 1);
      return true;
    }

    return false;
  }

  /**
   * Verifica si un número tiene una sesión autenticada válida
   */
  async verificarSesionActiva(telefono: string): Promise<boolean> {
    const session = this.authSessions.get(telefono);

    if (!session || !session.verificado) {
      return false;
    }

    if (new Date() > session.expira) {
      this.authSessions.delete(telefono);
      return false;
    }

    return true;
  }

  /**
   * Obtiene la información de la sesión activa
   */
  async obtenerSesion(telefono: string): Promise<AuthSession | null> {
    const session = this.authSessions.get(telefono);

    if (!session || !session.verificado || new Date() > session.expira) {
      return null;
    }

    return session;
  }

  /**
   * Cierra la sesión de autenticación
   */
  async cerrarSesion(telefono: string): Promise<void> {
    this.authSessions.delete(telefono);
  }

  /**
   * Asocia una empresa a la sesión autenticada
   */
  async asociarEmpresa(telefono: string, empresaId: number): Promise<void> {
    const session = this.authSessions.get(telefono);

    if (!session || !session.verificado) {
      throw new UnauthorizedException('Sesión no autenticada');
    }

    session.empresaId = empresaId;
  }

  /**
   * Limpia sesiones expiradas periódicamente
   */
  async limpiarSesionesExpiradas(): Promise<void> {
    const ahora = new Date();

    for (const [telefono, session] of this.authSessions.entries()) {
      if (ahora > session.expira) {
        this.authSessions.delete(telefono);
      }
    }
  }

  /**
   * Obtiene estadísticas de autenticación
   */
  async obtenerEstadisticas(): Promise<{
    sesiones_activas: number;
    sesiones_verificadas: number;
    sesiones_pendientes: number;
  }> {
    const sesiones = Array.from(this.authSessions.values());

    return {
      sesiones_activas: sesiones.length,
      sesiones_verificadas: sesiones.filter((s) => s.verificado).length,
      sesiones_pendientes: sesiones.filter((s) => !s.verificado).length,
    };
  }
}
