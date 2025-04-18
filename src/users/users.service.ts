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
import { PermisosService } from '../auth/services/permisos.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permisosService: PermisosService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.contrasena, 10);

    // Crear el usuario con su rol
    const user = await this.prisma.usuario.create({
      data: {
        nombre: createUserDto.nombre,
        email: createUserDto.email,
        contrasena: hashedPassword,
        telefono: createUserDto.telefono,
        rol: {
          connect: { id_rol: createUserDto.rolId },
        },
        // Si es un cliente, crear el perfil de cliente
        ...(createUserDto.rolId === 3 && {
          perfil_cliente: {
            create: {
              nombre: createUserDto.nombre,
              email: createUserDto.email,
              telefono: createUserDto.telefono,
            },
          },
        }),
      },
      include: {
        rol: true,
        perfil_cliente: true,
        empresas: {
          include: {
            empresa: true,
          },
        },
      },
    });

    // Si se proporciona un ID de empresa, crear la relación usuario-empresa
    if (createUserDto.empresaId) {
      await this.prisma.usuarioEmpresa.create({
        data: {
          usuario_id: user.id_usuario,
          empresa_id: createUserDto.empresaId,
          es_dueno: createUserDto.esDueno ?? false,
        },
      });
    }

    return user;
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
          perfil_cliente: true,
          empresas: {
            include: {
              empresa: true,
            },
          },
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

  private async obtenerTotalClientes(
    rolNombre: string,
    empresaId?: bigint,
  ): Promise<number | null> {
    if (rolNombre === 'ADMIN') {
      return await this.prisma.cliente.count();
    }

    if (rolNombre === 'EMPRESA' && empresaId) {
      return await this.prisma.clienteEmpresa.count({
        where: {
          empresa_id: empresaId,
        },
      });
    }

    return null;
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
        perfil_cliente: true,
        empresas: {
          include: {
            empresa: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener permisos del usuario
    const permisos = await this.permisosService.obtenerPermisosUsuario(
      BigInt(id),
    );

    // Obtener empresas a las que tiene acceso (si es admin)
    let empresasAcceso: any[] = [];
    if (user.rol.nombre === 'ADMIN') {
      empresasAcceso = await this.prisma.empresa.findMany({
        select: {
          id_empresa: true,
          nombre: true,
          tipo_empresa: true,
        },
        take: 5, // Limitamos a 5 para no sobrecargar la respuesta
      });
    } else {
      // Si no es admin, mostrar las empresas a las que está asociado
      empresasAcceso = user.empresas.map((ue) => ({
        id_empresa: ue.empresa.id_empresa,
        nombre: ue.empresa.nombre,
        tipo_empresa: ue.empresa.tipo_empresa,
        es_dueno: ue.es_dueno,
      }));
    }

    // Obtener clientes a los que tiene acceso (si es admin o empresa)
    let clientesAcceso: any[] = [];
    if (user.rol.nombre === 'ADMIN' || user.rol.nombre === 'EMPRESA') {
      const empresaIds =
        user.rol.nombre === 'ADMIN'
          ? undefined
          : user.empresas.map((ue) => ue.empresa_id);

      clientesAcceso = await this.prisma.clienteEmpresa
        .findMany({
          where: empresaIds
            ? {
                empresa_id: {
                  in: empresaIds,
                },
              }
            : undefined,
          select: {
            cliente: {
              select: {
                id_cliente: true,
                nombre: true,
                email: true,
              },
            },
            fecha_registro: true,
          },
          take: 5, // Limitamos a 5 para no sobrecargar la respuesta
        })
        .then((ce) =>
          ce.map((item) => ({
            id_cliente: item.cliente.id_cliente,
            nombre: item.cliente.nombre,
            email: item.cliente.email,
            fecha_registro: item.fecha_registro,
          })),
        );
    }

    // Obtener totales
    const totalClientes = await this.obtenerTotalClientes(
      user.rol.nombre,
      user.rol.nombre === 'EMPRESA' ? user.empresas[0]?.empresa_id : undefined,
    );
    const totalEmpresas =
      user.rol.nombre === 'ADMIN'
        ? await this.prisma.empresa.count()
        : user.empresas.length;

    // Devolver una respuesta más limpia y organizada
    return {
      usuario: {
        id: user.id_usuario.toString(),
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        rol: {
          id: user.rol.id_rol,
          nombre: user.rol.nombre,
          descripcion: user.rol.descripcion,
        },
      },
      permisos: permisos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        recurso: p.recurso,
        accion: p.accion,
      })),
      acceso: {
        empresas: empresasAcceso,
        clientes: clientesAcceso,
        totalEmpresas,
        totalClientes,
      },
    };
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

    // Actualizar el usuario
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
      },
      include: {
        rol: true,
        perfil_cliente: true,
        empresas: {
          include: {
            empresa: true,
          },
        },
      },
    });

    // Si se proporciona un ID de empresa, actualizar o crear la relación usuario-empresa
    if (updateUserDto.empresaId) {
      await this.prisma.usuarioEmpresa.upsert({
        where: {
          usuario_id_empresa_id: {
            usuario_id: BigInt(id),
            empresa_id: updateUserDto.empresaId,
          },
        },
        update: {
          es_dueno: updateUserDto.esDueno || false,
        },
        create: {
          usuario_id: BigInt(id),
          empresa_id: updateUserDto.empresaId,
          es_dueno: updateUserDto.esDueno || false,
        },
      });
    }

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: BigInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Eliminar relaciones primero
    await this.prisma.usuarioEmpresa.deleteMany({
      where: { usuario_id: BigInt(id) },
    });

    // Eliminar el usuario
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
        empresas: {
          include: {
            empresa: true,
          },
        },
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

  // Nuevos métodos para gestionar las relaciones usuario-empresa
  async asignarEmpresa(
    usuarioId: bigint,
    empresaId: bigint,
    esDueno: boolean = false,
  ) {
    return this.prisma.usuarioEmpresa.create({
      data: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
        es_dueno: esDueno,
      },
      include: {
        usuario: true,
        empresa: true,
      },
    });
  }

  async removerEmpresa(usuarioId: bigint, empresaId: bigint) {
    return this.prisma.usuarioEmpresa.delete({
      where: {
        usuario_id_empresa_id: {
          usuario_id: usuarioId,
          empresa_id: empresaId,
        },
      },
    });
  }

  async obtenerEmpresasUsuario(usuarioId: bigint) {
    return this.prisma.usuarioEmpresa.findMany({
      where: { usuario_id: usuarioId },
      include: { empresa: true },
    });
  }
}
