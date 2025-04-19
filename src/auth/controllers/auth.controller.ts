import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Delete,
  Param,
  Req,
  HttpCode,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { Request as ExpressRequest } from 'express';
import { SessionService } from '../services/session.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto, @Req() req: ExpressRequest) {
    return this.authService.register(registerDto, req);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(@Req() req: ExpressRequest) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    return this.sessionService.revokeSession(token, 'logout');
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar todas las sesiones' })
  @ApiResponse({
    status: 200,
    description: 'Todas las sesiones cerradas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logoutAll(@Request() req) {
    const currentToken = req.headers.authorization?.split(' ')[1];
    return this.sessionService.revokeAllUserSessions(
      req.user.id_usuario,
      currentToken,
    );
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener sesiones activas',
    description: 'Obtiene todas las sesiones activas del usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sesiones activas',
    schema: {
      example: [
        {
          id_sesion: 1,
          dispositivo: 'Chrome en Windows',
          ip_address: '192.168.1.1',
          ultima_actividad: '2023-04-19T12:00:00Z',
          fecha_creacion: '2023-04-19T11:00:00Z',
          fecha_expiracion: '2023-04-20T11:00:00Z',
        },
      ],
    },
  })
  async getSessions(@Req() req) {
    return this.sessionService.getUserSessions(req.user.id_usuario);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revocar sesión específica',
    description: 'Revoca una sesión específica por su ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión revocada exitosamente',
  })
  async revokeSession(@Param('id', ParseIntPipe) id: number, @Req() req) {
    // Verificar que la sesión pertenece al usuario
    const sessions = await this.sessionService.getUserSessions(
      req.user.id_usuario,
    );
    const session = sessions.find((s) => s.id_sesion === id);

    if (!session) {
      throw new UnauthorizedException(
        'No tienes permiso para revocar esta sesión',
      );
    }

    return this.sessionService.revokeSession(
      session.id_sesion.toString(),
      'revoked_by_user',
    );
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revocar todas las sesiones',
    description: 'Revoca todas las sesiones activas excepto la actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Todas las sesiones han sido revocadas',
  })
  async revokeAllSessions(@Req() req) {
    return this.sessionService.revokeAllUserSessions(
      req.user.id_usuario,
      req.headers.authorization?.split(' ')[1],
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido exitosamente' })
  getProfile(@Req() req) {
    return req.user;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar token' })
  @ApiResponse({ status: 200, description: 'Token refrescado exitosamente' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }
}
