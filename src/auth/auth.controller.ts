import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Delete,
  Param,
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

@ApiTags('Auth')
@Controller('api/auth')
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
  async register(@Body() registerDto: RegisterDto, @Request() req) {
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
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(loginDto, req);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(@Request() req) {
    return this.authService.logout(req.headers.authorization?.split(' ')[1]);
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
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id_usuario);
  }
}
