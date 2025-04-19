import { Module } from '@nestjs/common';
import { AtributosController } from '../controllers/atributos.controller';
import { AtributosService } from '../services/atributos.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AtributosController],
  providers: [AtributosService],
  exports: [AtributosService],
})
export class AtributosModule {}
