import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('EVOLUTION_API_URL') ||
      'http://localhost:8080';
    this.apiKey = this.configService.get<string>('EVOLUTION_API_TOKEN') || '';
  }

  /**
   * Obtener headers para las peticiones a Evolution API
   */
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey,
    };
  }

  /**
   * Crear una nueva instancia de WhatsApp
   */
  async createInstance(instanceName: string, webhookUrl: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/instance/create`,
          {
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              url: webhookUrl,
              enabled: true,
              events: [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'MESSAGES_SET',
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'SEND_MESSAGE',
                'CONNECTION_UPDATE',
              ],
              webhook_by_events: false,
            },
            settings: {
              reject_call: false,
              msg_call: 'En este momento no puedo atender llamadas',
              groups_ignore: true,
              always_online: true,
              read_messages: true,
              read_status: true,
            },
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Instancia creada: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al crear instancia');
    }
  }

  /**
   * Obtener información de una instancia
   */
  async getInstanceInfo(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/instance/fetchInstances`, {
          headers: this.getHeaders(),
          params: { instanceName },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al obtener información de instancia');
    }
  }

  /**
   * Obtener el código QR de una instancia
   */
  async getQRCode(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/instance/connect/${instanceName}`,
          { headers: this.getHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al obtener código QR');
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendTextMessage(instanceName: string, to: string, text: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/message/sendText/${instanceName}`,
          {
            number: this.formatPhoneNumber(to),
            text,
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Mensaje enviado a ${to}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al enviar mensaje');
    }
  }

  /**
   * Enviar mensaje con botones
   */
  async sendButtonMessage(
    instanceName: string,
    to: string,
    text: string,
    buttons: Array<{ displayText: string; id: string }>,
    title?: string,
    footer?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/message/sendButtons/${instanceName}`,
          {
            number: this.formatPhoneNumber(to),
            title: title || '',
            description: text,
            footer: footer || '',
            buttons: buttons.map((btn, index) => ({
              type: 'reply',
              reply: {
                id: btn.id || `btn_${index}`,
                title: btn.displayText,
              },
            })),
          },
          { headers: this.getHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al enviar mensaje con botones');
    }
  }

  /**
   * Enviar mensaje con lista
   */
  async sendListMessage(
    instanceName: string,
    to: string,
    title: string,
    text: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ title: string; description?: string; id: string }>;
    }>,
    footer?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/message/sendList/${instanceName}`,
          {
            number: this.formatPhoneNumber(to),
            title,
            description: text,
            footer: footer || '',
            buttonText,
            sections,
          },
          { headers: this.getHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al enviar mensaje con lista');
    }
  }

  /**
   * Enviar archivo
   */
  async sendFile(
    instanceName: string,
    to: string,
    url: string,
    caption?: string,
    fileName?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/message/sendMedia/${instanceName}`,
          {
            number: this.formatPhoneNumber(to),
            mediatype: 'document',
            media: url,
            caption: caption || '',
            fileName: fileName || 'document',
          },
          { headers: this.getHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al enviar archivo');
    }
  }

  /**
   * Enviar imagen
   */
  async sendImage(
    instanceName: string,
    to: string,
    url: string,
    caption?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/message/sendMedia/${instanceName}`,
          {
            number: this.formatPhoneNumber(to),
            mediatype: 'image',
            media: url,
            caption: caption || '',
          },
          { headers: this.getHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al enviar imagen');
    }
  }

  /**
   * Obtener estado de conexión de una instancia
   */
  async getConnectionStatus(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/instance/connectionState/${instanceName}`,
          { headers: this.getHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al obtener estado de conexión');
    }
  }

  /**
   * Desconectar instancia
   */
  async disconnectInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/instance/logout/${instanceName}`,
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Instancia desconectada: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al desconectar instancia');
    }
  }

  /**
   * Eliminar instancia
   */
  async deleteInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/instance/delete/${instanceName}`,
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Instancia eliminada: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Error al eliminar instancia');
    }
  }

  /**
   * Formatear número de teléfono para WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Eliminar espacios, guiones y paréntesis
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Si no empieza con +, agregar código de país (Perú por defecto)
    if (!cleaned.startsWith('+')) {
      // Si empieza con 51 (código de Perú), agregar +
      if (cleaned.startsWith('51')) {
        cleaned = `+${cleaned}`;
      } else {
        // Asumir que es un número peruano
        cleaned = `+51${cleaned}`;
      }
    }

    // Agregar @s.whatsapp.net si es necesario
    if (!cleaned.includes('@')) {
      cleaned = `${cleaned}@s.whatsapp.net`;
    }

    return cleaned;
  }

  /**
   * Manejar errores de la API
   */
  private handleError(error: any, message: string): never {
    if (error instanceof AxiosError) {
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 500;

      this.logger.error(`${message}: ${errorMessage}`, error.stack);
      throw new HttpException(
        {
          message,
          error: errorMessage,
          statusCode,
        },
        statusCode,
      );
    }

    this.logger.error(`${message}: ${error.message}`, error.stack);
    throw error;
  }
}
