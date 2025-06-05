import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
  changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }>;
}

@Injectable()
export class UserPasswordService implements IPasswordService {
  private readonly logger = new Logger(UserPasswordService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      this.logger.error(`Error al hashear contraseña: ${error.message}`);
      throw new BadRequestException('Error al procesar la contraseña');
    }
  }

  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      this.logger.error(`Error al comparar contraseña: ${error.message}`);
      return false;
    }
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    try {
      // Obtener usuario actual
      const user = await this.prisma.usuario.findUnique({
        where: { id_usuario: userId },
        select: { id_usuario: true, contrasena: true },
      });

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isPasswordValid = await this.comparePassword(
        changePasswordDto.currentPassword,
        user.contrasena,
      );

      if (!isPasswordValid) {
        this.logger.warn(
          `Intento fallido de cambio de contraseña para usuario ${userId}`,
        );
        throw new BadRequestException('Contraseña actual incorrecta');
      }

      // Hashear nueva contraseña
      const hashedPassword = await this.hashPassword(
        changePasswordDto.newPassword,
      );

      // Actualizar contraseña
      await this.prisma.usuario.update({
        where: { id_usuario: userId },
        data: { contrasena: hashedPassword },
      });

      this.logger.log(
        `Contraseña cambiada exitosamente para usuario: ${userId}`,
      );
      return { message: 'Contraseña actualizada exitosamente' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al cambiar contraseña para usuario ${userId}: ${error.message}`,
      );
      throw new BadRequestException('Error al cambiar la contraseña');
    }
  }
}
