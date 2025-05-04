import { Module, forwardRef } from '@nestjs/common';
import { UsuariosController } from './controllers/usuarios.controller';
import { UsuariosService } from './services/usuarios.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Autenticacion2FAController } from './controllers/autenticacion-2fa.controller';
import { Autenticacion2FAService } from './services/autenticacion-2fa.service';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, CacheModule.register(), forwardRef(() => AuthModule)],
  controllers: [UsuariosController, Autenticacion2FAController],
  providers: [UsuariosService, Autenticacion2FAService],
  exports: [UsuariosService, Autenticacion2FAService],
})
export class UsuariosModule {}
