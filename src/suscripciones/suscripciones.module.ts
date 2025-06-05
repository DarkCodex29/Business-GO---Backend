import { Module } from '@nestjs/common';
import { SuscripcionesService } from './services/suscripciones.service';
import { SuscripcionesController } from './controllers/suscripciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuscripcionesController],
  providers: [SuscripcionesService],
  exports: [SuscripcionesService],
})
export class SuscripcionesModule {}
