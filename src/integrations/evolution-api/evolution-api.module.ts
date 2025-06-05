import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EvolutionApiService } from './services/evolution-api.service';
import { EvolutionWebhookController } from './controllers/evolution-webhook.controller';
import { EvolutionInstanceController } from './controllers/evolution-instance.controller';
import { EvolutionMessageService } from './services/evolution-message.service';
import { EvolutionInstanceService } from './services/evolution-instance.service';
import { EvolutionWebhookService } from './services/evolution-webhook.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../../whatsapp/whatsapp.module';
import { AuditoriaModule } from '../../auditoria/auditoria.module';

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
  ],
  controllers: [EvolutionWebhookController, EvolutionInstanceController],
  providers: [
    EvolutionApiService,
    EvolutionMessageService,
    EvolutionInstanceService,
    EvolutionWebhookService,
  ],
  exports: [
    EvolutionApiService,
    EvolutionMessageService,
    EvolutionInstanceService,
  ],
})
export class EvolutionApiModule {}
