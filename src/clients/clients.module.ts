import { Module } from '@nestjs/common';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { DireccionesModule } from './direcciones.module';

@Module({
  imports: [DireccionesModule],
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientesModule {}
