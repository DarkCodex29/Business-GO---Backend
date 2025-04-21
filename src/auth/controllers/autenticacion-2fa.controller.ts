import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Autenticacion2FAService } from '../services/autenticacion-2fa.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';

@ApiTags('Autenticación 2FA')
@ApiBearerAuth()
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.SUPER_ADMIN)
export class Autenticacion2FAController {
  constructor(
    private readonly autenticacion2FAService: Autenticacion2FAService,
  ) {}

  @Post('generar/:usuarioId')
  @ApiOperation({ summary: 'Generar código 2FA para SUPER_ADMIN' })
  @ApiResponse({ status: 200, description: 'Código 2FA generado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async generarCodigo2FA(@Param('usuarioId') usuarioId: number) {
    const codigo =
      await this.autenticacion2FAService.generarCodigo2FA(usuarioId);
    return { codigo };
  }

  @Post('verificar')
  @ApiOperation({ summary: 'Verificar código 2FA' })
  @ApiResponse({ status: 200, description: 'Código verificado exitosamente' })
  @ApiResponse({ status: 401, description: 'Código inválido o expirado' })
  async verificarCodigo2FA(
    @Body('usuarioId') usuarioId: number,
    @Body('codigo') codigo: string,
  ) {
    const esValido = await this.autenticacion2FAService.verificarCodigo2FA(
      usuarioId,
      codigo,
    );
    return { esValido };
  }

  @Delete(':usuarioId')
  @ApiOperation({ summary: 'Desactivar 2FA' })
  @ApiResponse({ status: 200, description: '2FA desactivado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async desactivar2FA(@Param('usuarioId') usuarioId: number) {
    await this.autenticacion2FAService.desactivar2FA(usuarioId);
    return { mensaje: '2FA desactivado exitosamente' };
  }

  @Get('estado/:usuarioId')
  @ApiOperation({ summary: 'Obtener estado de 2FA' })
  @ApiResponse({
    status: 200,
    description: 'Estado de 2FA obtenido exitosamente',
  })
  async obtenerEstado2FA(@Param('usuarioId') usuarioId: number) {
    const estado =
      await this.autenticacion2FAService.obtenerEstado2FA(usuarioId);
    return { estado };
  }
}
