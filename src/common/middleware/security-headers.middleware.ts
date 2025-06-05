import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy (CSP)
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https: ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    // Headers de seguridad esenciales
    const securityHeaders = {
      // Prevenir ataques XSS
      'X-XSS-Protection': '1; mode=block',

      // Prevenir MIME type sniffing
      'X-Content-Type-Options': 'nosniff',

      // Prevenir clickjacking
      'X-Frame-Options': 'DENY',

      // Content Security Policy
      'Content-Security-Policy': cspDirectives,

      // Strict Transport Security (HSTS)
      'Strict-Transport-Security':
        'max-age=31536000; includeSubDomains; preload',

      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Feature Policy / Permissions Policy
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'payment=()',
        'usb=()',
      ].join(', '),

      // Ocultar información del servidor
      'X-Powered-By': 'BusinessGo',

      // Prevenir DNS prefetching en contextos inseguros
      'X-DNS-Prefetch-Control': 'off',

      // Cross-Origin policies
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };

    // Aplicar headers de seguridad
    Object.entries(securityHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Headers específicos para API
    if (req.path.startsWith('/api')) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    // Headers para webhook endpoints (mayor seguridad)
    if (req.path.includes('/webhook')) {
      res.setHeader('X-Webhook-Security', 'enabled');
      res.setHeader('X-Request-ID', this.generateRequestId());
    }

    // Log de requests sospechosos
    this.logSuspiciousActivity(req);

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logSuspiciousActivity(req: Request): void {
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript injection
      /eval\(/i, // Code execution
      /document\.cookie/i, // Cookie theft
    ];

    const userAgent = req.get('User-Agent') || '';
    const requestPath = req.path;
    const queryString = JSON.stringify(req.query);
    const requestBody = JSON.stringify(req.body);

    // Verificar patrones sospechosos
    const testString =
      `${requestPath} ${queryString} ${requestBody}`.toLowerCase();

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(testString)) {
        this.logger.warn('Actividad sospechosa detectada', {
          ip: req.ip,
          userAgent,
          path: requestPath,
          pattern: pattern.toString(),
          headers: req.headers,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }

    // Detectar user agents sospechosos
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /openvas/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /burp/i,
    ];

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        this.logger.warn('User-Agent sospechoso detectado', {
          ip: req.ip,
          userAgent,
          path: requestPath,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }
  }
}
