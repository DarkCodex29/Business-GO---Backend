import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UsuarioRolEmpresaDto } from '../dto/usuario-rol-empresa.dto';
import { Autenticacion2FADto } from '../dto/autenticacion-2fa.dto';
import { SesionUsuarioDto } from '../dto/sesion-usuario.dto';
import { PermisoUsuarioDto } from '../dto/permiso-usuario.dto';
import { PermisosService } from '../../auth/services/permisos.service';
import { UserValidationService } from './user-validation.service';
import { UserCacheService } from './user-cache.service';
import { UserPasswordService } from './user-password.service';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class UsuariosService extends BaseCrudService<
  any,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly permisosService: PermisosService,
    private readonly userValidationService: UserValidationService,
    private readonly userCacheService: UserCacheService,
    private readonly userPasswordService: UserPasswordService,
  ) {
    super(prisma, 'usuario', UsuariosService.name);
  }

  protected getModel() {
    return this.prisma.usuario;
  }

  protected getIdField(id: number) {
    return { id_usuario: id };
  }

  private buildSearchWhere(search?: string) {
    return search
      ? {
          OR: [
            { nombre: { contains: search } },
            { email: { contains: search } },
            { telefono: { contains: search } },
          ],
        }
      : {};
  }

  private async queryUsers(skip: number, limit: number, where: any) {
    return Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_registro: 'desc' },
        select: {
          id_usuario: true,
          nombre: true,
          email: true,
          telefono: true,
          estado_civil: true,
          fecha_registro: true,
          activo: true,
          rol: true,
          empresas: true,
          perfil_cliente: true,
        },
      }),
      this.prisma.usuario.count({ where }),
    ]);
  }

  async create(createUserDto: CreateUserDto) {
    try {
      // Validar datos usando el servicio especializado
      this.userValidationService.validateEmail(createUserDto.email);
      this.userValidationService.validatePhone(createUserDto.telefono);
      this.userValidationService.validateName(createUserDto.nombre);
      this.userValidationService.validatePassword(createUserDto.contrasena);

      // Validar unicidad del email
      await this.userValidationService.validateEmailUniqueness(
        createUserDto.email,
      );

      // Hashear contraseña usando el servicio especializado
      const hashedPassword = await this.userPasswordService.hashPassword(
        createUserDto.contrasena,
      );

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

      await this.userCacheService.invalidateUserCache();
      this.logger.log(`Usuario creado exitosamente: ${user.id_usuario}`);
      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.error(
          `Error al crear usuario: Email duplicado - ${createUserDto.email}`,
        );
        throw new ConflictException('El email ya está registrado');
      }
      this.logger.error(`Error al crear usuario: ${error.message}`);
      throw error;
    }
  }

  async findAll(page = 1, limit = 10, search?: string) {
    try {
      // Intentar obtener del caché
      const cachedResult = await this.userCacheService.getCachedUsers(
        page,
        limit,
        search,
      );
      if (cachedResult) return cachedResult;

      const skip = (page - 1) * limit;
      const where = this.buildSearchWhere(search);
      const [users, total] = await this.queryUsers(skip, limit, where);

      const result = {
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Cachear resultado
      await this.userCacheService.setCachedUsers(page, limit, search, result);
      this.logger.log(
        `Usuarios obtenidos y cacheados: ${users.length} de ${total}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error al obtener usuarios: ${error.message}`);
      throw error;
    }
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
    try {
      const user = await this.prisma.usuario.findUnique({
        where: { id_usuario: id },
      });

      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${id}`);
        throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error al obtener usuario ${id}: ${error.message}`);
      throw error;
    }
  }

  private async validateUpdateData(
    updateUserDto: UpdateUserDto,
    currentEmail: string,
  ) {
    if (updateUserDto.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateUserDto.email)) {
        throw new BadRequestException('Formato de email inválido');
      }
      if (updateUserDto.email !== currentEmail) {
        const existingUser = await this.prisma.usuario.findUnique({
          where: { email: updateUserDto.email },
        });
        if (existingUser) {
          throw new ConflictException('El email ya está registrado');
        }
      }
    }

    if (updateUserDto.telefono) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(updateUserDto.telefono)) {
        throw new BadRequestException('Formato de teléfono inválido');
      }
    }

    if (updateUserDto.nombre) {
      if (
        updateUserDto.nombre.length < 2 ||
        updateUserDto.nombre.length > 100
      ) {
        throw new BadRequestException(
          'El nombre debe tener entre 2 y 100 caracteres',
        );
      }
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findOne(id);
      await this.validateUpdateData(updateUserDto, user.email);

      const updatedUser = await this.prisma.usuario.update({
        where: { id_usuario: id },
        data: updateUserDto,
      });

      await this.userCacheService.invalidateUserCache();
      this.logger.log(`Usuario actualizado exitosamente: ${id}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error.code === 'P2002') {
        this.logger.error(
          `Error al actualizar usuario: Email duplicado - ${updateUserDto.email}`,
        );
        throw new ConflictException('El email ya está registrado');
      }
      this.logger.error(`Error al actualizar usuario ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      // Eliminar relaciones primero
      await this.prisma.usuarioEmpresa.deleteMany({
        where: { usuario_id: id },
      });

      // Eliminar el usuario
      await this.prisma.usuario.delete({
        where: { id_usuario: id },
      });

      await this.userCacheService.invalidateUserCache();
      this.logger.log(`Usuario eliminado exitosamente: ${id}`);
      return { message: 'Usuario eliminado exitosamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error al eliminar usuario ${id}: ${error.message}`);
      throw error;
    }
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

  async changePassword(id: number, changePasswordDto: ChangePasswordDto) {
    return this.userPasswordService.changePassword(id, changePasswordDto);
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

    if (!autenticacion2FADto.codigo) {
      throw new BadRequestException('El código 2FA es requerido');
    }

    const codigo = autenticacion2FADto.codigo;

    // Verificar si ya existe una configuración 2FA
    const existing2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: autenticacion2FADto.id_usuario },
    });

    if (existing2FA) {
      // Si ya existe, actualizamos la configuración
      return await this.prisma.autenticacion2FA.update({
        where: { id_usuario: autenticacion2FADto.id_usuario },
        data: {
          codigo_verificacion: codigo,
          fecha_expiracion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
          estado: 'ACTIVO',
        },
      });
    }

    // Si no existe, creamos una nueva configuración
    return await this.prisma.autenticacion2FA.create({
      data: {
        id_usuario: autenticacion2FADto.id_usuario,
        codigo_verificacion: codigo,
        fecha_expiracion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
        estado: 'ACTIVO',
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

  async verificarCodigo2FA(autenticacion2FADto: Autenticacion2FADto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: autenticacion2FADto.id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!autenticacion2FADto.codigo) {
      throw new BadRequestException('El código 2FA es requerido');
    }

    const config2FA = await this.prisma.autenticacion2FA.findUnique({
      where: { id_usuario: autenticacion2FADto.id_usuario },
    });

    if (!config2FA) {
      throw new NotFoundException('2FA no está configurado para este usuario');
    }

    if (config2FA.estado !== 'ACTIVO') {
      throw new BadRequestException('2FA no está activo para este usuario');
    }

    if (new Date() > config2FA.fecha_expiracion) {
      throw new BadRequestException('El código 2FA ha expirado');
    }

    if (config2FA.codigo_verificacion !== autenticacion2FADto.codigo) {
      throw new BadRequestException('Código 2FA inválido');
    }

    return { mensaje: 'Código 2FA verificado correctamente' };
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
