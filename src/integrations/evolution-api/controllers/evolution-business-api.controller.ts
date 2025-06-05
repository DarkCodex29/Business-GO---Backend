import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { EvolutionBusinessQueryService } from '../services/evolution-business-query.service';
import { EvolutionWebhookService } from '../services/evolution-webhook.service';

@ApiTags('Evolution Business API')
@Controller('api/business')
export class EvolutionBusinessApiController {
  constructor(
    private readonly businessQuery: EvolutionBusinessQueryService,
    private readonly webhookService: EvolutionWebhookService,
  ) {}

  /**
   * API genérica para consultas de stock
   */
  @Get('stock')
  @Public()
  @ApiOperation({
    summary: 'Consultar inventario',
    description: 'n8n llama esta API para consultas de stock',
  })
  @ApiHeader({ name: 'x-business-token', required: true })
  @ApiQuery({ name: 'filtro', required: false })
  async consultarStock(
    @Headers('x-business-token') businessToken: string,
    @Query('filtro') filtro?: string,
  ) {
    const tokenData =
      await this.webhookService.validateBusinessToken(businessToken);
    if (!tokenData) {
      throw new UnauthorizedException('Token empresarial inválido o expirado');
    }

    // Respuesta temporal - se implementará con los servicios completos
    const result = {
      productos: [],
      total: 0,
      message: 'Funcionalidad de stock pendiente de implementación completa',
    };

    return {
      success: true,
      data: result,
      context: {
        empresaId: tokenData.empresaId,
        userId: tokenData.userId,
      },
    };
  }

  /**
   * API genérica para consultas de trabajadores
   */
  @Get('trabajadores')
  @Public()
  @ApiOperation({
    summary: 'Consultar trabajadores',
    description: 'n8n llama esta API para consultas de personal',
  })
  @ApiHeader({ name: 'x-business-token', required: true })
  @ApiQuery({ name: 'nombre', required: false })
  async consultarTrabajadores(
    @Headers('x-business-token') businessToken: string,
    @Query('nombre') nombre?: string,
  ) {
    const tokenData =
      await this.webhookService.validateBusinessToken(businessToken);
    if (!tokenData) {
      throw new UnauthorizedException('Token empresarial inválido o expirado');
    }

    // Respuesta temporal - se implementará con los servicios completos
    const result = {
      trabajadores: [],
      total: 0,
      message:
        'Funcionalidad de trabajadores pendiente de implementación completa',
    };

    return {
      success: true,
      data: result,
      context: {
        empresaId: tokenData.empresaId,
        userId: tokenData.userId,
      },
    };
  }

  /**
   * API genérica para consultas de ventas
   */
  @Get('ventas')
  @Public()
  @ApiOperation({
    summary: 'Consultar ventas',
    description: 'n8n llama esta API para análisis de ventas',
  })
  @ApiHeader({ name: 'x-business-token', required: true })
  @ApiQuery({
    name: 'periodo',
    required: false,
    enum: ['hoy', 'semana', 'mes'],
  })
  async consultarVentas(
    @Headers('x-business-token') businessToken: string,
    @Query('periodo') periodo: 'hoy' | 'semana' | 'mes' = 'mes',
  ) {
    const tokenData =
      await this.webhookService.validateBusinessToken(businessToken);
    if (!tokenData) {
      throw new UnauthorizedException('Token empresarial inválido o expirado');
    }

    // Respuesta temporal - se implementará con los servicios completos
    const result = {
      ventas: [],
      total: 0,
      periodo: periodo,
      message: 'Funcionalidad de ventas pendiente de implementación completa',
    };

    return {
      success: true,
      data: result,
      context: {
        empresaId: tokenData.empresaId,
        userId: tokenData.userId,
      },
    };
  }

  /**
   * API genérica para dashboard/resumen
   */
  @Get('resumen')
  @Public()
  @ApiOperation({
    summary: 'Dashboard empresarial',
    description: 'n8n llama esta API para resúmenes generales',
  })
  @ApiHeader({ name: 'x-business-token', required: true })
  async consultarResumen(@Headers('x-business-token') businessToken: string) {
    const tokenData =
      await this.webhookService.validateBusinessToken(businessToken);
    if (!tokenData) {
      throw new UnauthorizedException('Token empresarial inválido o expirado');
    }

    // Respuesta temporal - se implementará con los servicios completos
    const result = {
      resumen: {
        ventas_mes: 0,
        productos_stock: 0,
        trabajadores_activos: 0,
        clientes_registrados: 0,
      },
      message: 'Funcionalidad de resumen pendiente de implementación completa',
    };

    return {
      success: true,
      data: result,
      context: {
        empresaId: tokenData.empresaId,
        userId: tokenData.userId,
      },
    };
  }

  /**
   * API para que n8n envíe respuestas de vuelta via WhatsApp
   */
  @Get('send-response')
  @Public()
  @ApiOperation({
    summary: 'Enviar respuesta via WhatsApp',
    description: 'n8n usa esta API para enviar respuestas formateadas',
  })
  @ApiHeader({ name: 'x-business-token', required: true })
  @ApiQuery({ name: 'phoneNumber', required: true })
  @ApiQuery({ name: 'message', required: true })
  @ApiQuery({ name: 'instanceName', required: true })
  async enviarRespuesta(
    @Headers('x-business-token') businessToken: string,
    @Query('phoneNumber') phoneNumber: string,
    @Query('message') message: string,
    @Query('instanceName') instanceName: string,
  ) {
    const tokenData =
      await this.webhookService.validateBusinessToken(businessToken);
    if (!tokenData) {
      throw new UnauthorizedException('Token empresarial inválido o expirado');
    }

    // Implementación pendiente del EvolutionApiService
    return {
      success: true,
      message: 'Respuesta enviada via WhatsApp (funcionalidad pendiente)',
      data: {
        phoneNumber,
        instanceName,
        messageLength: message.length,
      },
    };
  }

  /**
   * API para validar permisos dinámicamente
   */
  @Get('permisos')
  @Public()
  @ApiOperation({
    summary: 'Validar permisos empresariales',
    description: 'n8n valida permisos antes de mostrar datos sensibles',
  })
  @ApiHeader({ name: 'x-business-token', required: true })
  @ApiQuery({ name: 'recurso', required: true })
  async validarPermisos(
    @Headers('x-business-token') businessToken: string,
    @Query('recurso') recurso: string,
  ) {
    const tokenData =
      await this.webhookService.validateBusinessToken(businessToken);
    if (!tokenData) {
      throw new UnauthorizedException('Token empresarial inválido o expirado');
    }

    // Validación básica - se expandirá con sistema de permisos completo
    const permisos = {
      stock: true,
      ventas: true,
      trabajadores: true,
      resumen: true,
    };

    return {
      success: true,
      data: {
        recurso,
        permitido: permisos[recurso] || false,
        empresaId: tokenData.empresaId,
        userId: tokenData.userId,
      },
    };
  }
}
