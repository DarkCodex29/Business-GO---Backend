import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../session.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenValidationMiddleware implements NestMiddleware {
  constructor(
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = this.extractTokenFromHeader(req);

      if (!token) {
        throw new UnauthorizedException('Token no proporcionado');
      }

      // Decodificar el token para obtener el JTI
      const decoded = this.jwtService.decode(token);
      if (!decoded?.jti) {
        throw new UnauthorizedException('Token inválido');
      }

      // Verificar si el token está revocado
      const isRevoked = await this.sessionService.isTokenRevoked(decoded.jti);
      if (isRevoked) {
        throw new UnauthorizedException('Token revocado');
      }

      // Validar la sesión
      const session = await this.sessionService.validateSession(token);
      if (!session) {
        throw new UnauthorizedException('Sesión inválida o expirada');
      }

      // Actualizar última actividad
      await this.sessionService.updateLastActivity(token);

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
