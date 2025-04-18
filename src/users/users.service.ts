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
import { UsuarioRolEmpresaDto } from './dto/usuario-rol-empresa.dto';
import { Autenticacion2FADto } from './dto/autenticacion-2fa.dto';
import { SesionUsuarioDto } from './dto/sesion-usuario.dto';
import { PermisoUsuarioDto } from './dto/permiso-usuario.dto';
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
    empresaId?: number,
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

  async findOne(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      include: {
        rol: {
          include: {
            permisoRol: {
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
    const permisos = await this.permisosService.obtenerPermisosUsuario(id);

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
        id: user.id_usuario,
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
        id: p.id_permiso,
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

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
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
      where: { id_usuario: id },
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
            usuario_id: id,
            empresa_id: updateUserDto.empresaId,
          },
        },
        update: {
          es_dueno: updateUserDto.esDueno || false,
        },
        create: {
          usuario_id: id,
          empresa_id: updateUserDto.empresaId,
          es_dueno: updateUserDto.esDueno || false,
        },
      });
    }

    return updatedUser;
  }

  async remove(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Eliminar relaciones primero
    await this.prisma.usuarioEmpresa.deleteMany({
      where: { usuario_id: id },
    });

    // Eliminar el usuario
    await this.prisma.usuario.delete({
      where: { id_usuario: id },
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
      where: { id_usuario: userId },
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
      where: { id_usuario: userId },
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
    usuarioId: number,
    empresaId: number,
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

  async removerEmpresa(usuarioId: number, empresaId: number) {
    return this.prisma.usuarioEmpresa.delete({
      where: {
        usuario_id_empresa_id: {
          usuario_id: usuarioId,
          empresa_id: empresaId,
        },
      },
    });
  }

  async obtenerEmpresasUsuario(usuarioId: number) {
    return this.prisma.usuarioEmpresa.findMany({
      where: { usuario_id: usuarioId },
      include: { empresa: true },
    });
  }

  async asignarRolEmpresa(usuarioRolEmpresaDto: UsuarioRolEmpresaDto) {
    // Verificar si el usuario existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioRolEmpresaDto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si el rol de empresa existe
    const rolEmpresa = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: usuarioRolEmpresaDto.id_rol },
    });

    if (!rolEmpresa) {
      throw new NotFoundException('Rol de empresa no encontrado');
    }

    // Verificar si ya existe la asignación
    const existingAssignment = await this.prisma.usuarioRolEmpresa.findUnique({
      where: {
        id_usuario_id_rol: {
          id_usuario: usuarioRolEmpresaDto.id_usuario,
          id_rol: usuarioRolEmpresaDto.id_rol,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('El usuario ya tiene asignado este rol');
    }

    // Crear la asignación
    return await this.prisma.usuarioRolEmpresa.create({
      data: {
        id_usuario: usuarioRolEmpresaDto.id_usuario,
        id_rol: usuarioRolEmpresaDto.id_rol,
        fecha_inicio: usuarioRolEmpresaDto.fecha_inicio,
        fecha_fin: usuarioRolEmpresaDto.fecha_fin,
      },
    });
  }

  async removerRolEmpresa(usuarioId: number, rolId: number) {
    const assignment = await this.prisma.usuarioRolEmpresa.findUnique({
      where: {
        id_usuario_id_rol: {
          id_usuario: usuarioId,
          id_rol: rolId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación de rol no encontrada');
    }

    return await this.prisma.usuarioRolEmpresa.delete({
      where: {
        id_usuario_id_rol: {
          id_usuario: usuarioId,
          id_rol: rolId,
        },
      },
    });
  }

  async configurar2FA(autenticacion2FADto: Autenticacion2FADto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: autenticacion2FADto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya existe una configuración 2FA
    const existing2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: autenticacion2FADto.id_usuario },
    });

    if (existing2FA) {
      // Si ya existe, actualizamos la configuración
      return await this.prisma.autenticacion2FA.update({
        where: { id_usuario: autenticacion2FADto.id_usuario },
        data: {
          codigo_verificacion: autenticacion2FADto.codigo_verificacion,
          fecha_expiracion: autenticacion2FADto.fecha_expiracion,
          estado: autenticacion2FADto.estado,
        },
      });
    }

    // Si no existe, creamos una nueva configuración
    return await this.prisma.autenticacion2FA.create({
      data: {
        id_usuario: autenticacion2FADto.id_usuario,
        codigo_verificacion: autenticacion2FADto.codigo_verificacion,
        fecha_expiracion: autenticacion2FADto.fecha_expiracion,
        estado: autenticacion2FADto.estado,
      },
    });
  }

  async desactivar2FA(id_usuario: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const config2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario },
    });

    if (!config2FA) {
      throw new NotFoundException('2FA no está configurado para este usuario');
    }

    return await this.prisma.autenticacion2FA.delete({
      where: { id_usuario },
    });
  }

  async crearSesion(sesionUsuarioDto: SesionUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: sesionUsuarioDto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return await this.prisma.sesionUsuario.create({
      data: {
        id_usuario: sesionUsuarioDto.id_usuario,
        token: sesionUsuarioDto.token,
        dispositivo: sesionUsuarioDto.dispositivo,
        ip_address: sesionUsuarioDto.ip_address,
        activa: sesionUsuarioDto.activa,
        fecha_creacion: sesionUsuarioDto.fecha_creacion,
        fecha_expiracion: sesionUsuarioDto.fecha_expiracion,
      },
    });
  }

  async asignarPermiso(permisoUsuarioDto: PermisoUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: permisoUsuarioDto.usuario_id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: permisoUsuarioDto.permiso_id },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Verificar si ya existe la asignación
    const existingAssignment = await this.prisma.permisoUsuario.findUnique({
      where: {
        usuario_id_permiso_id: {
          usuario_id: permisoUsuarioDto.usuario_id,
          permiso_id: permisoUsuarioDto.permiso_id,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('El usuario ya tiene asignado este permiso');
    }

    return await this.prisma.permisoUsuario.create({
      data: {
        usuario_id: permisoUsuarioDto.usuario_id,
        permiso_id: permisoUsuarioDto.permiso_id,
        condiciones: permisoUsuarioDto.condiciones,
      },
    });
  }

  async removerPermiso(usuarioId: number, permisoId: number) {
    const assignment = await this.prisma.permisoUsuario.findUnique({
      where: {
        usuario_id_permiso_id: {
          usuario_id: usuarioId,
          permiso_id: permisoId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación de permiso no encontrada');
    }

    return await this.prisma.permisoUsuario.delete({
      where: {
        usuario_id_permiso_id: {
          usuario_id: usuarioId,
          permiso_id: permisoId,
        },
      },
    });
  }
}
