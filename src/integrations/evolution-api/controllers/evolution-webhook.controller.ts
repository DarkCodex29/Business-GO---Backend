import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { EvolutionWebhookService } from '../services/evolution-webhook.service';
import { Public } from '../../../common/decorators/public.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Evolution API Webhooks')
@Controller('webhooks/evolution')
@UseGuards(ThrottlerGuard)
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private readonly evolutionWebhookService: EvolutionWebhookService,
  ) {}

  @Post()
  @Public() // Webhook debe ser público
  @Throttle(100, 60) // 100 requests por minuto
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Excluir de Swagger ya que es interno
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-webhook-token') webhookToken: string,
    @Headers('x-instance-name') instanceName: string,
    @Req() req: Request,
  ) {
    try {
      // Log del webhook recibido
      this.logger.debug(
        `Webhook recibido de instancia: ${instanceName}`,
        JSON.stringify(payload, null, 2),
      );

      // Validar token del webhook
      const isValid = await this.evolutionWebhookService.validateWebhookToken(
        webhookToken,
        instanceName,
      );

      if (!isValid) {
        this.logger.warn(
          `Token de webhook inválido para instancia: ${instanceName}`,
        );
        return { status: 'unauthorized' };
      }

      // Procesar según el tipo de evento
      const { event } = payload;

      switch (event) {
        case 'messages.upsert':
          await this.evolutionWebhookService.handleIncomingMessage(
            instanceName,
            payload,
          );
          break;

        case 'messages.update':
          await this.evolutionWebhookService.handleMessageUpdate(
            instanceName,
            payload,
          );
          break;

        case 'connection.update':
          await this.evolutionWebhookService.handleConnectionUpdate(
            instanceName,
            payload,
          );
          break;

        case 'qrcode.updated':
          await this.evolutionWebhookService.handleQRCodeUpdate(
            instanceName,
            payload,
          );
          break;

        case 'send.message':
          await this.evolutionWebhookService.handleSentMessage(
            instanceName,
            payload,
          );
          break;

        default:
          this.logger.debug(
            `Evento no manejado: ${event} para instancia: ${instanceName}`,
          );
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error(
        `Error procesando webhook para instancia ${instanceName}:`,
        error.stack,
      );

      // Retornar OK para evitar reintentos de Evolution API
      return { status: 'error', message: 'Internal error' };
    }
  }

  @Post('status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint de salud para webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook activo' })
  async webhookStatus() {
    return {
      status: 'active',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test/:instanceName')
  @Throttle(10, 60) // Limitar tests a 10 por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Probar webhook para una instancia' })
  @ApiResponse({ status: 200, description: 'Test ejecutado' })
  async testWebhook(@Body() payload: any, @Req() req: Request) {
    const instanceName = req.params.instanceName;

    this.logger.log(`Test de webhook para instancia: ${instanceName}`, payload);

    // Simular procesamiento
    await this.evolutionWebhookService.handleTestWebhook(instanceName, payload);

    return {
      status: 'success',
      message: 'Test webhook procesado',
      instance: instanceName,
      timestamp: new Date().toISOString(),
    };
  }
}
