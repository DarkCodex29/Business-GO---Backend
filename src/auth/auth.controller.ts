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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { Request as ExpressRequest } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto, @Req() req: ExpressRequest) {
    return this.authService.login(loginDto.email, loginDto.password, req);
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
    return this.authService.logout(token);
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
    return this.authService.logoutAllSessions(
      req.user.id_usuario,
      currentToken,
    );
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las sesiones activas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sesiones activas',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getSessions(@Request() req) {
    return this.authService.getUserSessions(req.user.id_usuario);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revocar una sesión específica' })
  @ApiResponse({
    status: 200,
    description: 'Sesión revocada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async revokeSession(@Param('sessionId') sessionId: string, @Request() req) {
    return this.authService.logout(sessionId);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id_usuario;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.getProfile(Number(userId));
  }

  @Public()
  @Post('refresh')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}
