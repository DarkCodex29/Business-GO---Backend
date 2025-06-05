import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EvolutionApiService } from './services/evolution-api.service';
import { EvolutionWebhookController } from './controllers/evolution-webhook.controller';
import { EvolutionBusinessApiController } from './controllers/evolution-business-api.controller';
import { EvolutionWebhookService } from './services/evolution-webhook.service';
import { EvolutionBusinessQueryService } from './services/evolution-business-query.service';
import { EvolutionAuthService } from './services/evolution-auth.service';
import { EvolutionMessageFormatterService } from './services/evolution-message-formatter.service';
import { EvolutionWhatsappBridgeService } from './services/evolution-whatsapp-bridge.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../../whatsapp/whatsapp.module';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { NotificacionesModule } from '../../notificaciones/notificaciones.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    PrismaModule,
    WhatsappModule,
    AuditoriaModule,
    NotificacionesModule,
  ],
  controllers: [EvolutionWebhookController, EvolutionBusinessApiController],
  providers: [
    EvolutionApiService,
    EvolutionWebhookService,
    EvolutionBusinessQueryService,
    EvolutionAuthService,
    EvolutionMessageFormatterService,
    EvolutionWhatsappBridgeService,
  ],
  exports: [
    EvolutionApiService,
    EvolutionBusinessQueryService,
    EvolutionAuthService,
    EvolutionMessageFormatterService,
    EvolutionWhatsappBridgeService,
  ],
})
export class EvolutionApiModule {}
