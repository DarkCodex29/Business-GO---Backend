import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  Enhanced2FAService,
  TwoFactorConfig,
} from '../services/enhanced-2fa.service';
import { SecurityMonitoringService } from '../services/security-monitoring.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';

export class Enable2FADto {
  empresaId: number;
  method: '2FA_APP' | '2FA_EMAIL' | '2FA_SMS' | '2FA_WHATSAPP';
  phoneNumber?: string;
}

export class Verify2FADto {
  empresaId: number;
  code: string;
  isBackupCode?: boolean;
}

@ApiTags('Seguridad Avanzada')
@ApiBearerAuth()
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityController {
  constructor(
    private readonly enhanced2FAService: Enhanced2FAService,
    private readonly securityMonitoringService: SecurityMonitoringService,
  ) {}

  @Post('2fa/enable')
  @ApiOperation({ summary: 'Habilitar 2FA para una empresa específica' })
  @ApiResponse({
    status: 200,
    description: '2FA habilitado exitosamente',
    schema: {
      type: 'object',
      properties: {
        secret: {
          type: 'string',
          description: 'Secreto para app TOTP (solo para 2FA_APP)',
        },
        qrCode: {
          type: 'string',
          description: 'Código QR en base64 (solo para 2FA_APP)',
        },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Códigos de respaldo de un solo uso',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async enable2FA(@Request() req: any, @Body() dto: Enable2FADto) {
    const userId = req.user.id;

    return this.enhanced2FAService.enable2FA(
      userId,
      dto.empresaId,
      dto.method,
      dto.phoneNumber,
    );
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verificar código 2FA' })
  @ApiResponse({
    status: 200,
    description: 'Código verificado',
    schema: {
      type: 'object',
      properties: {
        verified: { type: 'boolean' },
        remainingAttempts: { type: 'number' },
        nextAttemptAllowed: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Código inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async verify2FA(@Request() req: any, @Body() dto: Verify2FADto) {
    const userId = req.user.id;

    return this.enhanced2FAService.verifyCode(
      userId,
      dto.empresaId,
      dto.code,
      dto.isBackupCode,
    );
  }

  @Delete('2fa/:empresaId')
  @ApiOperation({ summary: 'Deshabilitar 2FA para una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: '2FA deshabilitado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async disable2FA(
    @Request() req: any,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    const userId = req.user.id;

    await this.enhanced2FAService.disable2FA(userId, empresaId);
    return { message: '2FA deshabilitado exitosamente' };
  }

  @Get('2fa/:empresaId/config')
  @ApiOperation({ summary: 'Obtener configuración 2FA actual' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Configuración 2FA obtenida',
    schema: {
      type: 'object',
      properties: {
        empresaId: { type: 'number' },
        userId: { type: 'number' },
        method: {
          type: 'string',
          enum: ['2FA_APP', '2FA_EMAIL', '2FA_SMS', '2FA_WHATSAPP'],
        },
        isEnabled: { type: 'boolean' },
        phoneNumber: { type: 'string', nullable: true },
      },
    },
  })
  async get2FAConfig(
    @Request() req: any,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ): Promise<Omit<TwoFactorConfig, 'secret' | 'backupCodes'>> {
    const userId = req.user.id;
    const config = await this.enhanced2FAService.get2FAConfig(
      userId,
      empresaId,
    );

    // No devolver información sensible
    return {
      empresaId: config.empresaId,
      userId: config.userId,
      method: config.method,
      isEnabled: config.isEnabled,
      phoneNumber: config.phoneNumber,
    };
  }

  @Post('2fa/:empresaId/regenerate-backup-codes')
  @ApiOperation({ summary: 'Regenerar códigos de respaldo 2FA' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Códigos de respaldo regenerados',
    schema: {
      type: 'object',
      properties: {
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Nuevos códigos de respaldo',
        },
      },
    },
  })
  async regenerateBackupCodes(
    @Request() req: any,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    const userId = req.user.id;

    const backupCodes = await this.enhanced2FAService.regenerateBackupCodes(
      userId,
      empresaId,
    );
    return { backupCodes };
  }

  @Get('stats/:empresaId')
  @ApiOperation({ summary: 'Obtener estadísticas de seguridad de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'days',
    description: 'Días hacia atrás para el reporte',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de seguridad obtenidas',
    schema: {
      type: 'object',
      properties: {
        totalEventos: { type: 'number' },
        eventosPorSeveridad: {
          type: 'object',
          properties: {
            medium: { type: 'number' },
            high: { type: 'number' },
            critical: { type: 'number' },
          },
        },
        eventosPorTipo: { type: 'object' },
        eventosPorDia: { type: 'object' },
        ipsUnicas: { type: 'number' },
      },
    },
  })
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  async getSecurityStats(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('days') days?: number,
  ) {
    const daysToAnalyze = days ? parseInt(days.toString()) : 7;
    return this.securityMonitoringService.getSecurityStats(
      empresaId,
      daysToAnalyze,
    );
  }

  @Post('report-event')
  @ApiOperation({ summary: 'Reportar evento de seguridad' })
  @ApiResponse({ status: 200, description: 'Evento reportado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  async reportSecurityEvent(
    @Request() req: any,
    @Body()
    eventData: {
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
      empresaId?: number;
      details: any;
    },
  ) {
    await this.securityMonitoringService.logSecurityEvent({
      type: eventData.type,
      severity: eventData.severity,
      userId: req.user.id,
      empresaId: eventData.empresaId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: eventData.details,
      timestamp: new Date(),
    });

    return { message: 'Evento de seguridad reportado exitosamente' };
  }

  @Get('blocked-ips')
  @ApiOperation({ summary: 'Obtener lista de IPs bloqueadas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de IPs bloqueadas',
    schema: {
      type: 'object',
      properties: {
        blockedIps: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  async getBlockedIps() {
    // Esta funcionalidad requeriría almacenar las IPs bloqueadas en base de datos
    // Por ahora retornamos una respuesta básica
    return {
      message: 'Funcionalidad en desarrollo',
      blockedIps: [],
    };
  }

  @Post('emergency-lockdown/:empresaId')
  @ApiOperation({ summary: 'Activar bloqueo de emergencia para una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Bloqueo de emergencia activado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @Roles(ROLES.SUPER_ADMIN)
  async emergencyLockdown(
    @Request() req: any,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    // Registrar evento crítico
    await this.securityMonitoringService.logSecurityEvent({
      type: 'SUSPICIOUS_LOGIN',
      severity: 'CRITICAL',
      userId: req.user.id,
      empresaId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        action: 'emergency_lockdown',
        triggeredBy: req.user.email,
        reason: 'manual_emergency_activation',
      },
      timestamp: new Date(),
    });

    return {
      message: 'Bloqueo de emergencia activado para la empresa',
      empresaId,
      activatedBy: req.user.email,
      timestamp: new Date(),
    };
  }
}
