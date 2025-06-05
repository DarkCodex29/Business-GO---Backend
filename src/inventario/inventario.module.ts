import { Module } from '@nestjs/common';
import { InventarioController } from './controllers/inventario.controller';
import { InventarioAvanzadoController } from './controllers/inventario-avanzado.controller';
import { InventarioService } from './services/inventario.service';
import { InventarioValidationService } from './services/inventario-validation.service';
import { InventarioAuditService } from './services/inventario-audit.service';
import { InventarioNotificationService } from './services/inventario-notification.service';
import { InventarioSyncService } from './services/inventario-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProductosModule } from '../productos/products.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [PrismaModule, AuthModule, ProductosModule, NotificacionesModule],
  controllers: [InventarioController, InventarioAvanzadoController],
  providers: [
    InventarioService,
    InventarioValidationService,
    InventarioAuditService,
    InventarioNotificationService,
    InventarioSyncService,
  ],
  exports: [
    InventarioService,
    InventarioValidationService,
    InventarioAuditService,
    InventarioNotificationService,
    InventarioSyncService,
  ],
})
export class InventarioModule {}
