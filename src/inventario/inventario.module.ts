import { Module } from '@nestjs/common';
import { InventarioController } from './controllers/inventario.controller';
import { InventarioService } from './services/inventario.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
