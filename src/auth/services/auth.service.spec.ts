import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../../users/services/usuarios.service';
import { SessionService } from './session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// Crear mocks para los servicios dependientes
const mockUsuariosService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockSessionService = {
  createSession: jest.fn(),
  validateSession: jest.fn(),
  invalidateSession: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsuariosService,
          useValue: mockUsuariosService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens when login is successful', async () => {
      // Mock data
      const mockUser = {
        id_usuario: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        contrasena: await bcrypt.hash('password123', 10),
        rol_id: 1,
      };

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock service responses
      mockUsuariosService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');
      mockSessionService.createSession.mockResolvedValue({
        id_sesion: 1,
        token: 'session_token',
      });
      mockConfigService.get.mockReturnValue('30d');

      // Execute
      const result = await service.login(loginDto);

      // Assert
      expect(mockUsuariosService.findByEmail).toHaveBeenCalledWith(
        loginDto.email,
      );
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('contrasena');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Mock data
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Mock service responses
      mockUsuariosService.findByEmail.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Mock data
      const mockUser = {
        id_usuario: 1,
        email: 'test@example.com',
        contrasena: await bcrypt.hash('password123', 10),
      };

      const loginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      // Mock service responses
      mockUsuariosService.findByEmail.mockResolvedValue(mockUser);

      // Execute & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });
  });

  describe('validateToken', () => {
    it('should return decoded token when token is valid', async () => {
      // Mock data
      const token = 'valid_token';
      const decodedToken = {
        id_usuario: 1,
        email: 'test@example.com',
        rol: 'ADMIN',
      };

      // Mock service responses
      mockJwtService.verify.mockReturnValue(decodedToken);
      mockSessionService.validateSession.mockResolvedValue(true);

      // Execute
      const result = await service.validateToken(token);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        token,
        expect.any(Object),
      );
      expect(mockSessionService.validateSession).toHaveBeenCalled();
      expect(result).toEqual(decodedToken);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Mock data
      const token = 'invalid_token';

      // Mock service responses
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute & Assert
      await expect(service.validateToken(token)).rejects.toThrow(
        'Token inválido o expirado',
      );
    });
  });
});
