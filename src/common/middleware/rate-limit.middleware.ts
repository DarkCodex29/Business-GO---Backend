import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitRecord {
  timestamp: number;
  count: number;
}

interface IRateLimitStore {
  get(key: string): RateLimitRecord | undefined;
  set(key: string, record: RateLimitRecord): void;
  cleanup(): void;
}

interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  whitelist: string[];
}

// Servicio para gestionar el almacén de rate limiting
@Injectable()
class RateLimitStore implements IRateLimitStore {
  private readonly logger = new Logger(RateLimitStore.name);
  private readonly store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly windowMs: number) {
    // Configurar limpieza automática
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);
  }

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }

  cleanup(): void {
    try {
      const now = Date.now();
      let deletedCount = 0;

      for (const [key, record] of this.store.entries()) {
        if (now - record.timestamp > this.windowMs) {
          this.store.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.debug(
          `Limpieza de rate limit: ${deletedCount} registros eliminados`,
        );
      }
    } catch (error) {
      this.logger.error('Error durante limpieza de rate limit store:', error);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Servicio para configuración de rate limiting
@Injectable()
class RateLimitConfigService {
  private readonly config: IRateLimitConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      windowMs: this.configService.get<number>(
        'RATE_LIMIT_WINDOW_MS',
        60 * 1000,
      ),
      maxRequests: this.configService.get<number>('RATE_LIMIT_MAX', 100),
      whitelist: this.configService
        .get<string>('RATE_LIMIT_WHITELIST', '')
        .split(',')
        .filter(Boolean),
    };
  }

  getConfig(): IRateLimitConfig {
    return this.config;
  }

  isWhitelisted(ip: string): boolean {
    return this.config.whitelist.includes(ip);
  }
}

// Servicio principal de rate limiting
@Injectable()
class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    private readonly store: IRateLimitStore,
    private readonly config: IRateLimitConfig,
  ) {}

  checkRateLimit(
    ip: string,
    path: string,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime?: number;
  } {
    try {
      const now = Date.now();
      const key = `${ip}:${path}`;

      // Obtener el registro actual o crear uno nuevo
      const current = this.store.get(key) || { timestamp: now, count: 0 };

      // Si el registro es demasiado viejo, reiniciarlo
      if (now - current.timestamp > this.config.windowMs) {
        current.timestamp = now;
        current.count = 0;
      }

      // Incrementar el contador y guardar el registro
      current.count++;
      this.store.set(key, current);

      const remaining = Math.max(0, this.config.maxRequests - current.count);
      const allowed = current.count <= this.config.maxRequests;

      let resetTime: number | undefined;
      if (!allowed) {
        resetTime = Math.ceil(
          (current.timestamp + this.config.windowMs - now) / 1000,
        );
      }

      return { allowed, remaining, resetTime };
    } catch (error) {
      this.logger.error('Error en verificación de rate limit:', error);
      // En caso de error, permitir la solicitud
      return { allowed: true, remaining: this.config.maxRequests };
    }
  }
}

/**
 * Middleware para implementar rate limiting en las rutas de la API.
 * Limita el número de solicitudes que un cliente puede realizar en un período de tiempo.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly configService: RateLimitConfigService;
  private readonly store: RateLimitStore;
  private readonly rateLimitService: RateLimitService;

  constructor(configService: ConfigService) {
    this.configService = new RateLimitConfigService(configService);
    const config = this.configService.getConfig();

    this.store = new RateLimitStore(config.windowMs);
    this.rateLimitService = new RateLimitService(this.store, config);
  }

  /**
   * Implementación del middleware
   */
  use(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip ?? req.socket.remoteAddress;

      // Si la IP está en la lista blanca, omitir el rate limiting
      if (ip && this.configService.isWhitelisted(ip)) {
        return next();
      }

      const { allowed, remaining, resetTime } =
        this.rateLimitService.checkRateLimit(ip || 'unknown', req.path);

      const config = this.configService.getConfig();

      // Establecer encabezados de rate limit
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);

      // Si se excede el límite, devolver error 429
      if (!allowed && resetTime) {
        res.setHeader('Retry-After', resetTime);

        this.logger.warn(
          `Rate limit excedido para IP ${ip} en ruta ${req.path}. Reintentar en ${resetTime} segundos.`,
        );

        throw new HttpException(
          `Demasiadas solicitudes. Por favor, inténtelo de nuevo en ${resetTime} segundos.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error en rate limit middleware:', error);
      // En caso de error interno, permitir la solicitud
      next();
    }
  }

  /**
   * Método para limpiar recursos al destruir el middleware
   */
  onModuleDestroy() {
    if (this.store) {
      this.store.destroy();
    }
  }
}
