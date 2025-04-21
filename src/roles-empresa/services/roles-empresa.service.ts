import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';
import { AsignarRolDto } from '../dto/asignar-rol.dto';

@Injectable()
export class RolesEmpresaService {
  private readonly logger = new Logger(RolesEmpresaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async crearRolEmpresa(createRolDto: CreateEmpresaRolDto) {
    // Verificar unicidad de nombre en la empresa
    const rolExistente = await this.prisma.rolEmpresa.findFirst({
      where: {
        nombre: createRolDto.nombre,
        id_empresa: createRolDto.id_empresa,
      },
    });

    if (rolExistente) {
      throw new ConflictException(
        `Ya existe un rol con el nombre "${createRolDto.nombre}" en esta empresa`,
      );
    }

    const { permisos, ...rolData } = createRolDto;

    // Validar horarios si se proporcionan
    if (rolData.horario_inicio && rolData.horario_fin) {
      if (rolData.horario_inicio >= rolData.horario_fin) {
        throw new ConflictException(
          'La hora de inicio debe ser menor que la hora de fin',
        );
      }
    }

    // Validar fechas si se proporcionan
    if (rolData.fecha_inicio && rolData.fecha_fin) {
      if (rolData.fecha_inicio >= rolData.fecha_fin) {
        throw new ConflictException(
          'La fecha de inicio debe ser menor que la fecha de fin',
        );
      }
    }

    return this.prisma.rolEmpresa.create({
      data: {
        ...rolData,
        permisos: {
          create:
            permisos?.map((id) => ({
              permiso_id: id,
              recurso: 'empresa',
              accion: 'gestionar',
            })) || [],
        },
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
      },
    });
  }

  async findAll(id_empresa: number) {
    return this.prisma.rolEmpresa.findMany({
      where: {
        id_empresa,
        // Filtrar roles activos basados en fechas
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
      },
    });
  }

  async obtenerRol(id_empresa: number, id: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return rol;
  }

  async actualizarRol(
    id_empresa: number,
    id: number,
    updateRolDto: UpdateEmpresaRolDto,
  ) {
    const { permisos, ...rolData } = updateRolDto;

    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    // Verificar unicidad de nombre si se está actualizando
    if (rolData.nombre) {
      const rolExistente = await this.prisma.rolEmpresa.findFirst({
        where: {
          nombre: rolData.nombre,
          id_empresa,
          id_rol: { not: id },
        },
      });

      if (rolExistente) {
        throw new ConflictException(
          `Ya existe un rol con el nombre "${rolData.nombre}" en esta empresa`,
        );
      }
    }

    // Validar horarios si se actualizan
    if (rolData.horario_inicio && rolData.horario_fin) {
      if (rolData.horario_inicio >= rolData.horario_fin) {
        throw new ConflictException(
          'La hora de inicio debe ser menor que la hora de fin',
        );
      }
    }

    // Validar fechas si se actualizan
    if (rolData.fecha_inicio && rolData.fecha_fin) {
      if (rolData.fecha_inicio >= rolData.fecha_fin) {
        throw new ConflictException(
          'La fecha de inicio debe ser menor que la fecha de fin',
        );
      }
    }

    return this.prisma.rolEmpresa.update({
      where: { id_rol: id },
      data: {
        ...rolData,
        fecha_actualizacion: new Date(),
        permisos: permisos
          ? {
              deleteMany: {},
              create: permisos.map((id) => ({
                permiso_id: id,
                recurso: 'empresa',
                accion: 'gestionar',
              })),
            }
          : undefined,
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
      },
    });
  }

  async eliminarRol(id_empresa: number, id: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
      include: {
        usuarios: true,
        usuarios_empresa: true,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    // Verificar si el rol tiene usuarios asignados
    if (rol.usuarios.length > 0 || rol.usuarios_empresa.length > 0) {
      throw new ConflictException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    // Eliminar permisos asociados
    await this.prisma.permisoRolEmpresa.deleteMany({
      where: {
        id_rol: id,
      },
    });

    return this.prisma.rolEmpresa.delete({
      where: { id_rol: id },
    });
  }

  async asignarPermisos(
    id_empresa: number,
    id_rol: number,
    permisoIds: number[],
  ) {
    // Verificar que el rol existe
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id_rol} no encontrado`);
    }

    // Verificar que los permisos existen
    for (const permisoId of permisoIds) {
      const permiso = await this.prisma.permiso.findUnique({
        where: { id_permiso: permisoId },
      });

      if (!permiso) {
        throw new NotFoundException(
          `Permiso con ID ${permisoId} no encontrado`,
        );
      }
    }

    // Eliminar permisos existentes
    await this.prisma.permisoRolEmpresa.deleteMany({
      where: {
        id_rol,
      },
    });

    // Crear nuevos permisos
    await Promise.all(
      permisoIds.map((permisoId) =>
        this.prisma.permisoRolEmpresa.create({
          data: {
            id_rol,
            permiso_id: permisoId,
            recurso: 'empresa',
            accion: 'gestionar',
          },
        }),
      ),
    );

    this.logger.log(
      `Permisos asignados al rol ${id_rol} de la empresa ${id_empresa}`,
    );

    return this.prisma.rolEmpresa.findUnique({
      where: { id_rol },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async eliminarPermiso(
    id_empresa: number,
    id_rol: number,
    id_permiso: number,
  ) {
    // Verificar que el rol existe
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id_rol} no encontrado`);
    }

    // Verificar que el permiso existe
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso },
    });

    if (!permiso) {
      throw new NotFoundException(`Permiso con ID ${id_permiso} no encontrado`);
    }

    // Verificar que el permiso está asignado al rol
    const permisoRol = await this.prisma.permisoRolEmpresa.findFirst({
      where: {
        id_rol,
        permiso_id: id_permiso,
      },
    });

    if (!permisoRol) {
      throw new NotFoundException(
        `El permiso ${id_permiso} no está asignado al rol ${id_rol}`,
      );
    }

    // Eliminar el permiso
    await this.prisma.permisoRolEmpresa.delete({
      where: { id_permiso_rol: permisoRol.id_permiso_rol },
    });

    this.logger.log(
      `Permiso ${id_permiso} eliminado del rol ${id_rol} de la empresa ${id_empresa}`,
    );

    return { mensaje: 'Permiso eliminado exitosamente' };
  }

  async verificarPermiso(
    id_usuario: number,
    id_empresa: number,
    recurso: string,
    accion: string,
  ) {
    // Verificar si el usuario tiene el permiso directamente
    const permisoUsuario = await this.prisma.permisoUsuario.findFirst({
      where: {
        usuario_id: id_usuario,
        permiso: {
          recurso,
          accion,
        },
      },
    });

    if (permisoUsuario) {
      return { tienePermiso: true, origen: 'directo' };
    }

    // Verificar si el usuario tiene el permiso a través de un rol de empresa
    const usuarioRolEmpresa = await this.prisma.usuarioRolEmpresa.findFirst({
      where: {
        id_usuario,
        rolEmpresa: {
          id_empresa,
        },
      },
      include: {
        rolEmpresa: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (usuarioRolEmpresa) {
      const tienePermiso = usuarioRolEmpresa.rolEmpresa.permisos.some(
        (p) => p.permiso.recurso === recurso && p.permiso.accion === accion,
      );

      if (tienePermiso) {
        return {
          tienePermiso: true,
          origen: 'rol_empresa',
          rol: usuarioRolEmpresa.rolEmpresa.nombre,
        };
      }
    }

    // Verificar si el usuario tiene el permiso a través de un rol del sistema
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
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
      },
    });

    if (usuario && usuario.rol) {
      const tienePermiso = usuario.rol.permisoRol.some(
        (p) => p.permiso.recurso === recurso && p.permiso.accion === accion,
      );

      if (tienePermiso) {
        return {
          tienePermiso: true,
          origen: 'rol_sistema',
          rol: usuario.rol.nombre,
        };
      }
    }

    return { tienePermiso: false };
  }

  async inicializarRolesPredefinidos(id_empresa: number) {
    // Verificar si ya existen roles predefinidos
    const rolesExistentes = await this.prisma.rolEmpresa.findMany({
      where: {
        id_empresa,
      },
    });

    if (rolesExistentes.length > 0) {
      throw new ConflictException(
        'Ya existen roles para esta empresa. No se pueden inicializar roles predefinidos.',
      );
    }

    // Roles predefinidos
    const rolesPredefinidos = [
      {
        nombre: 'Administrador',
        descripcion: 'Administrador de la empresa con acceso total',
        id_empresa,
      },
      {
        nombre: 'Gerente',
        descripcion: 'Gerente con acceso a la mayoría de funcionalidades',
        id_empresa,
      },
      {
        nombre: 'Empleado',
        descripcion: 'Empleado con acceso básico',
        id_empresa,
      },
    ];

    // Crear roles predefinidos
    const rolesCreados = await Promise.all(
      rolesPredefinidos.map((rol) =>
        this.prisma.rolEmpresa.create({
          data: rol,
        }),
      ),
    );

    this.logger.log(
      `Roles predefinidos inicializados para la empresa ${id_empresa}`,
    );

    return rolesCreados;
  }

  async asignarRol(empresaId: number, asignarRolDto: AsignarRolDto) {
    const { id_usuario, id_rol } = asignarRolDto;

    // Verificar que el usuario existe y pertenece a la empresa
    const usuario = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: id_usuario,
        empresa_id: empresaId,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado en la empresa');
    }

    // Verificar que el rol existe y pertenece a la empresa
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol,
        id_empresa: empresaId,
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado en la empresa');
    }

    // Verificar que el usuario no tenga ya asignado este rol
    const rolAsignado = await this.prisma.usuarioRolEmpresa.findFirst({
      where: {
        id_usuario,
        id_rol,
      },
    });

    if (rolAsignado) {
      throw new ConflictException('El usuario ya tiene asignado este rol');
    }

    // Asignar el rol al usuario
    return this.prisma.usuarioRolEmpresa.create({
      data: {
        id_usuario,
        id_rol,
        fecha_inicio: new Date(),
      },
      include: {
        usuario: true,
        rolEmpresa: true,
      },
    });
  }

  async removerRol(empresaId: number, id_usuario: number, id_rol: number) {
    // Verificar que el usuario existe y pertenece a la empresa
    const usuario = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: id_usuario,
        empresa_id: empresaId,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado en la empresa');
    }

    // Verificar que el rol existe y pertenece a la empresa
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol,
        id_empresa: empresaId,
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado en la empresa');
    }

    // Verificar que el usuario tenga asignado este rol
    const rolAsignado = await this.prisma.usuarioRolEmpresa.findFirst({
      where: {
        id_usuario,
        id_rol,
      },
    });

    if (!rolAsignado) {
      throw new NotFoundException('El usuario no tiene asignado este rol');
    }

    // Remover el rol del usuario
    return this.prisma.usuarioRolEmpresa.delete({
      where: {
        id_usuario_rol: rolAsignado.id_usuario_rol,
      },
      include: {
        usuario: true,
        rolEmpresa: true,
      },
    });
  }
}
