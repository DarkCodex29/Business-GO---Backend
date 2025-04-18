import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { SessionService } from './session.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BigIntInterceptor } from '../common/interceptors/bigint.interceptor';
import { TokenValidationMiddleware } from './middlewares/token-validation.middleware';
import { RolesGuard } from './guards/roles.guard';
import { PermisosService } from './services/permisos.service';
import { PermisosGuard } from './guards/permisos.guard';
import { InitPermisosCommand } from './commands/init-permisos.command';
import { PermisosController } from './controllers/permisos.controller';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
            '1d',
          ),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    PrismaModule,
    EmailModule,
  ],
  controllers: [AuthController, PermisosController],
  providers: [
    AuthService,
    JwtStrategy,
    SessionService,
    TokenValidationMiddleware,
    PermisosService,
    InitPermisosCommand,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermisosGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BigIntInterceptor,
    },
  ],
  exports: [AuthService, JwtModule, SessionService, PermisosService],
})
export class AuthModule {}
