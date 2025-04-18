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
    // Verificar si el email ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    try {
      // Crear el usuario
      const user = await this.prisma.usuario.create({
        data: {
          nombre: createUserDto.nombre,
          email: createUserDto.email,
          contrasena: hashedPassword,
          rol: {
            connect: {
              id_rol: createUserDto.rolId,
            },
          },
          ...(createUserDto.clienteId && {
            cliente: {
              connect: {
                id_cliente: createUserDto.clienteId,
              },
            },
          }),
          ...(createUserDto.empresaId && {
            empresa: {
              connect: {
                id_empresa: createUserDto.empresaId,
              },
            },
          }),
        },
        include: {
          rol: true,
          cliente: true,
          empresa: true,
        },
      });

      // Excluir la contraseña de la respuesta
      const { contrasena, ...result } = user;
      return result;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
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

    // Excluir las contraseñas y convertir BigInt a string
    const usersWithoutPassword = users.map((user) => {
      const { contrasena, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        id_usuario: userWithoutPassword.id_usuario.toString(),
        // Convertir otros campos BigInt si existen
        cliente: userWithoutPassword.cliente
          ? {
              ...userWithoutPassword.cliente,
              id_cliente: userWithoutPassword.cliente.id_cliente.toString(),
            }
          : null,
        empresa: userWithoutPassword.empresa
          ? {
              ...userWithoutPassword.empresa,
              id_empresa: userWithoutPassword.empresa.id_empresa.toString(),
            }
          : null,
      };
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

  async findOne(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: {
          select: {
            id_rol: true,
            nombre: true,
          },
        },
        // Solo incluimos cliente y empresa si son necesarios y solo los campos relevantes
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
          },
        },
        sesiones: {
          where: { activa: true },
          select: {
            id_sesion: true,
            dispositivo: true,
            ultima_actividad: true,
          },
          orderBy: {
            ultima_actividad: 'desc',
          },
          take: 5, // Limitamos a las últimas 5 sesiones activas
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return {
      ...user,
      id_usuario: user.id_usuario.toString(),
      cliente: user.cliente
        ? {
            ...user.cliente,
            id_cliente: user.cliente.id_cliente.toString(),
          }
        : null,
      empresa: user.empresa
        ? {
            ...user.empresa,
            id_empresa: user.empresa.id_empresa.toString(),
          }
        : null,
      sesiones: user.sesiones.map((sesion) => ({
        ...sesion,
        id_sesion: sesion.id_sesion.toString(),
      })),
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Verificar si el usuario existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
    });

    if (!existingUser) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Verificar si el nuevo email ya está en uso
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.usuario.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    // Actualizar el usuario
    const updatedUser = await this.prisma.usuario.update({
      where: { id_usuario: BigInt(id) },
      data: {
        nombre: updateUserDto.nombre,
        email: updateUserDto.email,
        telefono: updateUserDto.telefono,
        ...(updateUserDto.rol_id && {
          rol: {
            connect: {
              id_rol: updateUserDto.rol_id,
            },
          },
        }),
      },
      include: {
        rol: true,
        cliente: true,
        empresa: true,
      },
    });

    // Excluir la contraseña
    const { contrasena, ...result } = updatedUser;
    return result;
  }

  async remove(id: number) {
    try {
      await this.prisma.usuario.delete({
        where: { id_usuario: BigInt(id) },
      });

      return {
        message: `Usuario con ID ${id} eliminado exitosamente`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      }
      throw error;
    }
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
