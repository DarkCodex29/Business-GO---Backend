import { Module } from '@nestjs/common';
import { DireccionesService } from './services/direcciones.service';
import { DireccionesController } from './controllers/direcciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DireccionesController],
  providers: [DireccionesService],
  exports: [DireccionesService],
})
export class DireccionesModule {}
