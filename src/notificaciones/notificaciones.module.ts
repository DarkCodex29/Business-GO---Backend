import { Module } from '@nestjs/common';
import { NotificacionesController } from './controllers/notificaciones.controller';
import { NotificacionesService } from './services/notificaciones.service';
import { BaseNotificacionesService } from './services/base-notificaciones.service';
import { NotificacionesValidationService } from './services/notificaciones-validation.service';
import { NotificacionesCalculationService } from './services/notificaciones-calculation.service';
import { NotificacionesWhatsappBridgeService } from './services/notificaciones-whatsapp-bridge.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesValidationService,
    NotificacionesCalculationService,
    NotificacionesWhatsappBridgeService,
    // BaseNotificacionesService es abstracto, no se registra como provider
  ],
  exports: [
    NotificacionesService,
    NotificacionesValidationService,
    NotificacionesCalculationService,
    NotificacionesWhatsappBridgeService,
  ],
})
export class NotificacionesModule {}
