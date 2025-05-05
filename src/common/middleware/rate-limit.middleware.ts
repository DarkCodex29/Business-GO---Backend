import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitRecord {
  timestamp: number;
  count: number;
}

/**
 * Middleware para implementar rate limiting en las rutas de la API.
 * Limita el número de solicitudes que un cliente puede realizar en un período de tiempo.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store: Map<string, RateLimitRecord> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly whitelist: string[];

  constructor(private readonly configService: ConfigService) {
    // Valores por defecto si no se encuentran en la configuración
    this.windowMs = this.configService.get<number>(
      'RATE_LIMIT_WINDOW_MS',
      60 * 1000,
    ); // 1 minuto por defecto
    this.maxRequests = this.configService.get<number>('RATE_LIMIT_MAX', 100); // 100 solicitudes por defecto
    this.whitelist = this.configService
      .get<string>('RATE_LIMIT_WHITELIST', '')
      .split(',')
      .filter(Boolean);

    // Limpiar registros viejos periódicamente
    setInterval(() => this.cleanupStore(), this.windowMs);
  }

  /**
   * Implementación del middleware
   */
  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip ?? req.socket.remoteAddress;

    // Si la IP está en la lista blanca, omitir el rate limiting
    if (ip && this.whitelist.includes(ip)) {
      return next();
    }

    const now = Date.now();
    const key = `${ip}:${req.path}`;

    // Obtener el registro actual o crear uno nuevo
    const current = this.store.get(key) || { timestamp: now, count: 0 };

    // Si el registro es demasiado viejo, reiniciarlo
    if (now - current.timestamp > this.windowMs) {
      current.timestamp = now;
      current.count = 0;
    }

    // Incrementar el contador y guardar el registro
    current.count++;
    this.store.set(key, current);

    // Establecer encabezados de rate limit
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.maxRequests - current.count),
    );

    // Si se excede el límite, devolver error 429
    if (current.count > this.maxRequests) {
      const resetTime = Math.ceil(
        (current.timestamp + this.windowMs - now) / 1000,
      );
      res.setHeader('Retry-After', resetTime);
      throw new HttpException(
        `Demasiadas solicitudes. Por favor, inténtelo de nuevo en ${resetTime} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  /**
   * Limpiar registros antiguos para evitar fugas de memoria
   */
  private cleanupStore() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now - record.timestamp > this.windowMs) {
        this.store.delete(key);
      }
    }
  }
}
