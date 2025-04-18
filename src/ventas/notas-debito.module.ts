import { Module } from '@nestjs/common';
import { NotasDebitoService } from './services/notas-debito.service';
import { NotasDebitoController } from './controllers/notas-debito.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotasDebitoController],
  providers: [NotasDebitoService],
  exports: [NotasDebitoService],
})
export class NotasDebitoModule {}
