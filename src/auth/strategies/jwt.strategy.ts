import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_ACCESS_TOKEN_SECRET no está configurado en las variables de entorno',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Validar que el token no esté revocado
    if (payload.jti) {
      const isRevoked = await this.authService.isTokenRevoked(payload.jti);
      if (isRevoked) {
        throw new UnauthorizedException('Token revocado');
      }
    }

    // Delegar la obtención del usuario al AuthService
    const user = await this.authService.validateTokenPayload(payload);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return user;
  }
}
