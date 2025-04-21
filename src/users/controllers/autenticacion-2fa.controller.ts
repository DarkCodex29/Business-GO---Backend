import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { Autenticacion2FAService } from '../services/autenticacion-2fa.service';
import { Autenticacion2FADto } from '../dto/autenticacion-2fa.dto';

@ApiTags('Autenticación 2FA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('autenticacion-2fa')
export class Autenticacion2FAController {
  constructor(
    private readonly autenticacion2FAService: Autenticacion2FAService,
  ) {}

  @Post('configurar')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Configurar autenticación 2FA para un usuario' })
  @ApiResponse({
    status: 201,
    description: 'Autenticación 2FA configurada correctamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o 2FA ya activo' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async configurar2FA(@Body() dto: Autenticacion2FADto) {
    return this.autenticacion2FAService.configurar2FA(dto);
  }

  @Post('desactivar')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Desactivar autenticación 2FA para un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Autenticación 2FA desactivada correctamente',
  })
  @ApiResponse({ status: 400, description: '2FA no está activo' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async desactivar2FA(@Body() dto: Autenticacion2FADto) {
    return this.autenticacion2FAService.desactivar2FA(dto);
  }

  @Post('verificar')
  @ApiOperation({ summary: 'Verificar código 2FA' })
  @ApiResponse({
    status: 200,
    description: 'Código 2FA verificado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Código 2FA inválido o 2FA no configurado',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async verificarCodigo2FA(@Body() dto: Autenticacion2FADto) {
    return this.autenticacion2FAService.verificarCodigo2FA(dto);
  }
}
