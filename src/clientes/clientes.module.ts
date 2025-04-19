import { Module } from '@nestjs/common';
import { ClientesController } from './controllers/clientes.controller';
import { ClientesService } from './services/clientes.service';
import { ClientesNotificacionesController } from './controllers/clientes-notificaciones.controller';
import { ClientesNotificacionesService } from './services/clientes-notificaciones.service';
import { DireccionesController } from './controllers/direcciones.controller';
import { DireccionesService } from './services/direcciones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ClientesController,
    ClientesNotificacionesController,
    DireccionesController,
  ],
  providers: [
    ClientesService,
    ClientesNotificacionesService,
    DireccionesService,
  ],
  exports: [ClientesService, ClientesNotificacionesService, DireccionesService],
})
export class ClientesModule {}
