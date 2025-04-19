import { Module } from '@nestjs/common';
import { CategoriasController } from '../controllers/categorias.controller';
import { CategoriasService } from '../services/categorias.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}
