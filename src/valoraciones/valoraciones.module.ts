import { Module } from '@nestjs/common';
import { ValoracionesController } from './controllers/valoraciones.controller';
import { ValoracionesService } from './services/valoraciones.service';
import { ValoracionesValidationService } from './services/valoraciones-validation.service';
import { ValoracionesCalculationService } from './services/valoraciones-calculation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ValoracionesController],
  providers: [
    ValoracionesService,
    ValoracionesValidationService,
    ValoracionesCalculationService,
  ],
  exports: [ValoracionesService],
})
export class ValoracionesModule {}
