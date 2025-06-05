import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IUserValidator {
  validateEmail(email: string): void;
  validatePhone(phone?: string): void;
  validateName(name: string): void;
  validatePassword(password: string): void;
  validateEmailUniqueness(email: string, currentEmail?: string): Promise<void>;
}

@Injectable()
export class UserValidationService implements IUserValidator {
  constructor(private readonly prisma: PrismaService) {}

  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Formato de email inválido');
    }
  }

  validatePhone(phone?: string): void {
    if (phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        throw new BadRequestException('Formato de teléfono inválido');
      }
    }
  }

  validateName(name: string): void {
    if (name.length < 2 || name.length > 100) {
      throw new BadRequestException(
        'El nombre debe tener entre 2 y 100 caracteres',
      );
    }
  }

  validatePassword(password: string): void {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
      );
    }
  }

  async validateEmailUniqueness(
    email: string,
    currentEmail?: string,
  ): Promise<void> {
    if (currentEmail && email === currentEmail) {
      return; // No cambió el email
    }

    const existingUser = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }
  }
}
