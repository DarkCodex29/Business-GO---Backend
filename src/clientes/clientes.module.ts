import { Module } from '@nestjs/common';
import { ClientesController } from './controllers/clientes.controller';
import { ClientesService } from './services/clientes.service';
import { ClienteValidationService } from './services/cliente-validation.service';
import { BaseClienteService } from './services/base-cliente.service';
import { DireccionesController } from './controllers/direcciones.controller';
import { DireccionesService } from './services/direcciones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientesController, DireccionesController],
  providers: [ClientesService, ClienteValidationService, DireccionesService],
  exports: [ClientesService, ClienteValidationService, DireccionesService],
})
export class ClientesModule {}
