import { Module } from '@nestjs/common';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappValidationService } from './services/whatsapp-validation.service';
import { WhatsappCalculationService } from './services/whatsapp-calculation.service';
import { BaseWhatsappService } from './services/base-whatsapp.service';
import { ConsultasWhatsappService } from './services/consultas-whatsapp.service';
import { MensajesWhatsappService } from './services/mensajes-whatsapp.service';
import { WhatsappController } from './controllers/whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsappController],
  providers: [
    // Servicio original (mantenido para compatibilidad)
    WhatsappService,

    // Servicios refactorizados con principios SOLID
    WhatsappValidationService,
    WhatsappCalculationService,
    BaseWhatsappService,
    ConsultasWhatsappService,
    MensajesWhatsappService,
  ],
  exports: [
    // Exportar servicio original para compatibilidad
    WhatsappService,

    // Exportar servicios especializados para uso directo
    WhatsappValidationService,
    WhatsappCalculationService,
    BaseWhatsappService,
    ConsultasWhatsappService,
    MensajesWhatsappService,
  ],
})
export class WhatsappModule {}
