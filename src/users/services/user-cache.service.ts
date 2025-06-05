import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface IUserCacheService {
  getCacheKey(page: number, limit: number, search?: string): string;
  getCachedUsers(page: number, limit: number, search?: string): Promise<any>;
  setCachedUsers(
    page: number,
    limit: number,
    search: string | undefined,
    data: any,
  ): Promise<void>;
  invalidateUserCache(): Promise<void>;
}

@Injectable()
export class UserCacheService implements IUserCacheService {
  private readonly logger = new Logger(UserCacheService.name);
  private readonly CACHE_TTL = 300; // 5 minutos en segundos

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  getCacheKey(page: number, limit: number, search?: string): string {
    return `users_page${page}_limit${limit}_search${search ?? 'none'}`;
  }

  async getCachedUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<any> {
    try {
      const cacheKey = this.getCacheKey(page, limit, search);
      const cachedResult = await this.cacheManager.get(cacheKey);

      if (cachedResult) {
        this.logger.log(`Resultados obtenidos del caché: ${cacheKey}`);
        return cachedResult;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error al obtener caché: ${error.message}`);
      return null; // Si falla el caché, continuar sin él
    }
  }

  async setCachedUsers(
    page: number,
    limit: number,
    search: string | undefined,
    data: any,
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(page, limit, search);
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.logger.log(`Datos cacheados exitosamente: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Error al cachear datos: ${error.message}`);
      // No lanzamos el error para no interrumpir la operación principal
    }
  }

  async invalidateUserCache(): Promise<void> {
    try {
      // Invalidar múltiples patrones de caché
      const patterns = [
        this.getCacheKey(1, 10, ''),
        this.getCacheKey(1, 10, undefined),
        this.getCacheKey(1, 20, ''),
        this.getCacheKey(1, 20, undefined),
      ];

      await Promise.all(
        patterns.map((pattern) => this.cacheManager.del(pattern)),
      );

      this.logger.log('Caché de usuarios invalidado exitosamente');
    } catch (error) {
      this.logger.error(`Error al invalidar caché: ${error.message}`);
      // No lanzamos el error para no interrumpir la operación principal
    }
  }
}
