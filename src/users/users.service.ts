import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.contrasena, 10);

    const user = await this.prisma.usuario.create({
      data: {
        nombre: createUserDto.nombre,
        email: createUserDto.email,
        contrasena: hashedPassword,
        telefono: createUserDto.telefono,
        rol: {
          connect: { id_rol: createUserDto.rolId },
        },
        ...(createUserDto.clienteId && {
          cliente: {
            connect: { id_cliente: createUserDto.clienteId },
          },
        }),
        ...(createUserDto.empresaId && {
          empresa: {
            connect: { id_empresa: createUserDto.empresaId },
          },
        }),
      },
      include: {
        rol: true,
        cliente: true,
        empresa: true,
      },
    });

    const { contrasena, ...result } = user;
    return result;
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { nombre: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: limit,
        where,
        include: {
          rol: true,
          cliente: true,
          empresa: true,
        },
        orderBy: {
          nombre: 'asc',
        },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    const usersWithoutPassword = users.map((user) => {
      const { contrasena, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      data: usersWithoutPassword,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
      include: {
        rol: true,
        cliente: true,
        empresa: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { contrasena, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.usuario.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    let hashedPassword;
    if (updateUserDto.contrasena) {
      hashedPassword = await bcrypt.hash(updateUserDto.contrasena, 10);
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id_usuario: BigInt(id) },
      data: {
        nombre: updateUserDto.nombre,
        email: updateUserDto.email,
        contrasena: hashedPassword,
        telefono: updateUserDto.telefono,
        ...(updateUserDto.rolId && {
          rol: {
            connect: { id_rol: updateUserDto.rolId },
          },
        }),
        ...(updateUserDto.clienteId && {
          cliente: {
            connect: { id_cliente: updateUserDto.clienteId },
          },
        }),
        ...(updateUserDto.empresaId && {
          empresa: {
            connect: { id_empresa: updateUserDto.empresaId },
          },
        }),
      },
      include: {
        rol: true,
        cliente: true,
        empresa: true,
      },
    });

    const { contrasena, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.delete({
      where: { id_usuario: BigInt(id) },
    });

    return { message: 'Usuario eliminado correctamente' };
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
      },
    });
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.contrasena,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (
      changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword
    ) {
      throw new BadRequestException('Las contraseñas nuevas no coinciden');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.usuario.update({
      where: { id_usuario: BigInt(userId) },
      data: {
        contrasena: hashedPassword,
      },
    });

    return {
      message: 'Contraseña actualizada exitosamente',
    };
  }
}
