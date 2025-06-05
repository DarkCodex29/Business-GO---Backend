import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service';
import { EmailService } from '../../email/email.service';

export interface SecurityEvent {
  type:
    | 'SUSPICIOUS_LOGIN'
    | 'RATE_LIMIT_EXCEEDED'
    | 'MULTIPLE_FAILED_ATTEMPTS'
    | 'UNUSUAL_LOCATION'
    | 'TOKEN_ABUSE'
    | 'XSS_ATTEMPT'
    | 'SQL_INJECTION'
    | 'SUSPICIOUS_USER_AGENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: number;
  empresaId?: number;
  ip: string;
  userAgent?: string;
  details: any;
  timestamp: Date;
}

export interface SecurityRule {
  name: string;
  condition: (events: SecurityEvent[]) => boolean;
  action: (triggeredEvents: SecurityEvent[]) => Promise<void>;
  cooldown: number; // milliseconds
  lastTriggered?: Date;
}

@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);
  private eventQueue: SecurityEvent[] = [];
  private rules: SecurityRule[] = [];
  private blockList = new Set<string>();
  private readonly maxEventQueueSize = 10000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
    private readonly emailService: EmailService,
  ) {
    this.initializeSecurityRules();
    this.startEventProcessor();
  }

  /**
   * Registra un evento de seguridad para análisis
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Agregar timestamp si no existe
    event.timestamp = event.timestamp || new Date();

    // Agregar a la cola de eventos
    this.eventQueue.push(event);

    // Limpiar cola si excede el tamaño máximo
    if (this.eventQueue.length > this.maxEventQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxEventQueueSize);
    }

    // Registrar en auditoria
    await this.logToAuditoria(event);

    // Log inmediato para eventos críticos
    if (event.severity === 'CRITICAL') {
      this.logger.error('Evento de seguridad crítico detectado', {
        type: event.type,
        userId: event.userId,
        empresaId: event.empresaId,
        ip: event.ip,
        details: event.details,
      });
    }
  }

  /**
   * Verifica si una IP está bloqueada
   */
  isBlocked(ip: string): boolean {
    return this.blockList.has(ip);
  }

  /**
   * Bloquea una IP temporalmente
   */
  async blockIp(ip: string, duration: number = 3600000): Promise<void> {
    this.blockList.add(ip);

    // Programar desbloqueo automático
    setTimeout(() => {
      this.blockList.delete(ip);
      this.logger.log(`IP ${ip} desbloqueada automáticamente`);
    }, duration);

    this.logger.warn(`IP ${ip} bloqueada por ${duration / 1000} segundos`);
  }

  /**
   * Obtiene estadísticas de seguridad para una empresa
   */
  async getSecurityStats(empresaId: number, days: number = 7): Promise<any> {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - days);

    const eventos = await this.prisma.auditoria.findMany({
      where: {
        empresa_id: empresaId,
        fecha_evento: { gte: fechaInicio },
        severidad: { in: ['warning', 'error', 'critical'] },
      },
      orderBy: { fecha_evento: 'desc' },
    });

    const stats = {
      totalEventos: eventos.length,
      eventosPorSeveridad: {
        warning: eventos.filter((e) => e.severidad === 'warning').length,
        error: eventos.filter((e) => e.severidad === 'error').length,
        critical: eventos.filter((e) => e.severidad === 'critical').length,
      },
      eventosPorTipo: {} as any,
      eventosPorDia: {} as any,
      ipsUnicas: new Set(eventos.map((e) => e.ip_address).filter(Boolean)).size,
    };

    // Agrupar por tipo
    eventos.forEach((evento) => {
      const tipo = evento.recurso || 'unknown';
      stats.eventosPorTipo[tipo] = (stats.eventosPorTipo[tipo] || 0) + 1;
    });

    // Agrupar por día
    eventos.forEach((evento) => {
      const dia = evento.fecha_evento.toISOString().split('T')[0];
      stats.eventosPorDia[dia] = (stats.eventosPorDia[dia] || 0) + 1;
    });

    return stats;
  }

  /**
   * Analiza intentos de login fallidos para detectar ataques de fuerza bruta
   */
  async analyzeFailedLogins(userId: number, ip: string): Promise<void> {
    const recentEvents = this.eventQueue.filter(
      (event) =>
        event.type === 'MULTIPLE_FAILED_ATTEMPTS' &&
        event.userId === userId &&
        event.ip === ip &&
        Date.now() - event.timestamp.getTime() < 3600000, // Última hora
    );

    if (recentEvents.length >= 5) {
      await this.logSecurityEvent({
        type: 'MULTIPLE_FAILED_ATTEMPTS',
        severity: 'HIGH',
        userId,
        ip,
        userAgent: recentEvents[0]?.userAgent,
        details: {
          attemptCount: recentEvents.length,
          timeWindow: '1 hour',
          pattern: 'brute_force_suspected',
        },
        timestamp: new Date(),
      });

      // Bloquear IP automáticamente
      await this.blockIp(ip, 3600000); // 1 hora
    }
  }

  /**
   * Detecta uso anómalo de tokens
   */
  async detectTokenAnomaly(
    userId: number,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const recentSessions = await this.prisma.sesionUsuario.findMany({
      where: {
        id_usuario: userId,
        fecha_expiracion: { gt: new Date() },
      },
      orderBy: { fecha_creacion: 'desc' },
      take: 10,
    });

    // Detectar múltiples IPs simultáneas
    const uniqueIps = new Set(
      recentSessions.filter((s) => s.ip_address).map((s) => s.ip_address),
    );

    if (uniqueIps.size > 3) {
      await this.logSecurityEvent({
        type: 'TOKEN_ABUSE',
        severity: 'MEDIUM',
        userId,
        ip,
        userAgent,
        details: {
          uniqueIpsCount: uniqueIps.size,
          recentSessionsCount: recentSessions.length,
          ips: Array.from(uniqueIps),
        },
        timestamp: new Date(),
      });
    }

    // Detectar cambios súbitos de user agent
    const userAgents = recentSessions
      .filter((s) => s.dispositivo)
      .map((s) => s.dispositivo)
      .slice(0, 5);

    if (userAgents.length >= 3 && !userAgents.includes(userAgent)) {
      await this.logSecurityEvent({
        type: 'SUSPICIOUS_LOGIN',
        severity: 'MEDIUM',
        userId,
        ip,
        userAgent,
        details: {
          newUserAgent: userAgent,
          recentUserAgents: userAgents,
          pattern: 'user_agent_switch',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Inicializa las reglas de seguridad
   */
  private initializeSecurityRules(): void {
    this.rules = [
      {
        name: 'Multiple Failed Logins',
        condition: (events) => {
          const failedLogins = events.filter(
            (e) =>
              e.type === 'MULTIPLE_FAILED_ATTEMPTS' &&
              Date.now() - e.timestamp.getTime() < 900000, // 15 minutos
          );
          return failedLogins.length >= 3;
        },
        action: async (events) => {
          const ips = [...new Set(events.map((e) => e.ip))];
          for (const ip of ips) {
            await this.blockIp(ip, 1800000); // 30 minutos
          }
          await this.sendSecurityAlert(
            'Múltiples intentos de login fallidos detectados',
            events,
          );
        },
        cooldown: 1800000, // 30 minutos
      },
      {
        name: 'Critical Events Spike',
        condition: (events) => {
          const criticalEvents = events.filter(
            (e) =>
              e.severity === 'CRITICAL' &&
              Date.now() - e.timestamp.getTime() < 300000, // 5 minutos
          );
          return criticalEvents.length >= 3;
        },
        action: async (events) => {
          await this.sendSecurityAlert(
            'Pico de eventos críticos detectado',
            events,
          );
        },
        cooldown: 900000, // 15 minutos
      },
      {
        name: 'Suspicious User Agent',
        condition: (events) => {
          return events.some((e) => e.type === 'SUSPICIOUS_USER_AGENT');
        },
        action: async (events) => {
          const suspiciousEvents = events.filter(
            (e) => e.type === 'SUSPICIOUS_USER_AGENT',
          );
          for (const event of suspiciousEvents) {
            await this.blockIp(event.ip, 7200000); // 2 horas
          }
        },
        cooldown: 3600000, // 1 hora
      },
    ];
  }

  /**
   * Procesa eventos en la cola y aplica reglas
   */
  private startEventProcessor(): void {
    setInterval(() => {
      if (this.eventQueue.length === 0) return;

      for (const rule of this.rules) {
        // Verificar cooldown
        if (
          rule.lastTriggered &&
          Date.now() - rule.lastTriggered.getTime() < rule.cooldown
        ) {
          continue;
        }

        // Evaluar condición
        if (rule.condition(this.eventQueue)) {
          rule.lastTriggered = new Date();
          rule
            .action(
              this.eventQueue.filter(
                (e) => Date.now() - e.timestamp.getTime() < 3600000, // Eventos de la última hora
              ),
            )
            .catch((error) => {
              this.logger.error(`Error ejecutando regla ${rule.name}:`, error);
            });
        }
      }
    }, 30000); // Ejecutar cada 30 segundos
  }

  /**
   * Registra el evento en la tabla de auditoría
   */
  private async logToAuditoria(event: SecurityEvent): Promise<void> {
    try {
      await this.prisma.auditoria.create({
        data: {
          accion: 'configurar',
          recurso: 'sistema',
          descripcion: `Evento de seguridad: ${event.type}`,
          severidad: event.severity.toLowerCase() as any,
          empresa_id: event.empresaId || 1, // Default empresa
          ip_address: event.ip,
          user_agent: event.userAgent,
          metadatos: {
            securityEvent: {
              type: event.type,
              userId: event.userId,
              details: event.details,
              timestamp: event.timestamp,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error logging security event to auditoria:', error);
    }
  }

  /**
   * Envía alerta de seguridad a administradores
   */
  private async sendSecurityAlert(
    message: string,
    events: SecurityEvent[],
  ): Promise<void> {
    try {
      // Obtener administradores del sistema
      const admins = await this.prisma.usuario.findMany({
        where: {
          rol: {
            nombre: 'SUPER_ADMIN',
          },
        },
        select: {
          id_usuario: true,
          email: true,
          nombre: true,
        },
      });

      const alertData = {
        message,
        eventCount: events.length,
        affectedIps: [...new Set(events.map((e) => e.ip))],
        eventTypes: [...new Set(events.map((e) => e.type))],
        timestamp: new Date(),
      };

      // Enviar notificaciones en la aplicación
      for (const admin of admins) {
        await this.notificacionesService.create(
          admin.id_usuario,
          0, // cliente_id default
          {
            tipo: 'IN_APP' as any,
            titulo: 'Alerta de Seguridad',
            contenido: message,
            estado: 'PENDIENTE' as any,
            datosAdicionales: JSON.stringify(alertData),
          },
        );
      }

      // Enviar emails a administradores (funcionalidad a implementar)
      // const emailPromises = admins.map((admin) =>
      //   this.emailService.sendSecurityAlert(
      //     admin.email,
      //     admin.nombre,
      //     alertData,
      //   ),
      // );
      // await Promise.all(emailPromises);

      this.logger.warn(`Alerta de seguridad enviada: ${message}`, alertData);
    } catch (error) {
      this.logger.error('Error sending security alert:', error);
    }
  }
}
