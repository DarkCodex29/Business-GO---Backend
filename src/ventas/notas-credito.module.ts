import { Module } from '@nestjs/common';
import { NotasCreditoService } from './services/notas-credito.service';
import { NotasCreditoController } from './controllers/notas-credito.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotasCreditoController],
  providers: [NotasCreditoService],
  exports: [NotasCreditoService],
})
export class NotasCreditoModule {}
