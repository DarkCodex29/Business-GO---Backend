import { Module, Global, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsuariosModule } from '../users/usuarios.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { SessionService } from './services/session.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TokenValidationMiddleware } from '../common/middleware/token-validation.middleware';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosService } from './services/permisos.service';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { InitPermisosCommand } from '../common/commands/init-permisos.command';
import { PermisosController } from './controllers/permisos.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RolesModule } from '../roles/roles.module';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UsuariosModule),
    PrismaModule,
    EmailModule,
    RolesModule,
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
    PrismaService,
  ],
  exports: [
    AuthService,
    JwtModule,
    SessionService,
    PermisosService,
    RolesModule,
  ],
})
export class AuthModule {}
