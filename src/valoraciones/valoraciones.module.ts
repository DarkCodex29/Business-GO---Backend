import { Module } from '@nestjs/common';
import { ValoracionesController } from './controllers/valoraciones.controller';
import { ValoracionesService } from './services/valoraciones.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, AuthModule, PermissionsModule],
  controllers: [ValoracionesController],
  providers: [ValoracionesService],
  exports: [ValoracionesService],
})
export class ValoracionesModule {}
