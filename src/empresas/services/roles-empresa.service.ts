import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRolEmpresaDto } from '../dto/create-rol-empresa.dto';
import { UpdateRolEmpresaDto } from '../dto/update-rol-empresa.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { RolEmpresa, PermisoRolEmpresa } from '@prisma/client';
import { AsignarRolDto } from '../dto/asignar-rol.dto';

@Injectable()
export class RolesEmpresaService {
  private readonly logger = new Logger(RolesEmpresaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async crearRolEmpresa(createRolEmpresaDto: CreateRolEmpresaDto) {
    try {
      const { permisos, id_empresa, ...rolData } = createRolEmpresaDto;

      return await this.prisma.rolEmpresa.create({
        data: {
          ...rolData,
          empresa: {
            connect: { id_empresa },
          },
          permisos: {
            create:
              permisos?.map((permiso) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
                permiso_id: permiso.id_permiso,
              })) || [],
          },
        },
        include: {
          permisos: {
            include: {
              Permiso: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear rol de empresa: ${error.message}`);
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un rol con este nombre en la empresa',
        );
      }
      throw error;
    }
  }

  async findAll(empresaId: number) {
    return await this.prisma.rolEmpresa.findMany({
      where: { id_empresa: empresaId },
      include: {
        permisos: {
          include: {
            Permiso: true,
          },
        },
        usuarios: true,
      },
    });
  }

  async findOne(id: number) {
    const rol = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: id },
      include: {
        permisos: {
          include: {
            Permiso: true,
          },
        },
        usuarios: true,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return rol;
  }

  async update(id: number, updateRolEmpresaDto: UpdateRolEmpresaDto) {
    try {
      const { permisos, ...rolData } = updateRolEmpresaDto;

      if (permisos) {
        // Primero eliminamos los permisos existentes
        await this.prisma.permisoRolEmpresa.deleteMany({
          where: { id_rol: id },
        });

        // Luego creamos los nuevos permisos
        return await this.prisma.rolEmpresa.update({
          where: { id_rol: id },
          data: {
            ...rolData,
            permisos: {
              create: permisos.map((permiso) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
                permiso_id: permiso.id_permiso,
              })),
            },
          },
          include: {
            permisos: {
              include: {
                Permiso: true,
              },
            },
          },
        });
      }

      return await this.prisma.rolEmpresa.update({
        where: { id_rol: id },
        data: rolData,
        include: {
          permisos: {
            include: {
              Permiso: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un rol con este nombre en la empresa',
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.rolEmpresa.delete({
        where: { id_rol: id },
      });
      return { message: 'Rol eliminado correctamente' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }
      throw error;
    }
  }

  async asignarRol(asignarRolDto: AsignarRolDto) {
    try {
      const { id_usuario, id_rol, fecha_inicio, fecha_fin } = asignarRolDto;
      return await this.prisma.usuarioRolEmpresa.create({
        data: {
          Usuario: {
            connect: { id_usuario },
          },
          RolEmpresa: {
            connect: { id_rol },
          },
          fecha_inicio,
          fecha_fin,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('El usuario ya tiene asignado este rol');
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('Usuario o rol no encontrado');
      }
      throw error;
    }
  }

  async removerRol(usuarioId: number, rolId: number) {
    try {
      await this.prisma.usuarioRolEmpresa.deleteMany({
        where: {
          AND: [{ id_usuario: usuarioId }, { id_rol: rolId }],
        },
      });
      return { message: 'Rol removido correctamente' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('La asignación de rol no existe');
      }
      throw error;
    }
  }

  async inicializarRolesPredefinidos(empresaId: number) {
    const rolesPredefinidos = [
      {
        nombre: 'Administrador',
        descripcion: 'Rol con acceso total a la empresa',
        id_empresa: empresaId,
        permisos: [
          { id_permiso: 1, recurso: 'dashboard', accion: 'ver' },
          { id_permiso: 2, recurso: 'usuarios', accion: 'gestionar' },
          { id_permiso: 3, recurso: 'roles', accion: 'gestionar' },
          { id_permiso: 4, recurso: 'permisos', accion: 'gestionar' },
          { id_permiso: 5, recurso: 'configuracion', accion: 'gestionar' },
        ],
      },
      {
        nombre: 'Usuario',
        descripcion: 'Rol básico para usuarios de la empresa',
        id_empresa: empresaId,
        permisos: [{ id_permiso: 1, recurso: 'dashboard', accion: 'ver' }],
      },
    ];

    try {
      for (const rol of rolesPredefinidos) {
        const { permisos, ...rolData } = rol;
        await this.prisma.rolEmpresa.create({
          data: {
            ...rolData,
            permisos: {
              create: permisos.map((permiso) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
                permiso_id: permiso.id_permiso,
              })),
            },
          },
        });
      }
      return { message: 'Roles predefinidos inicializados correctamente' };
    } catch (error) {
      this.logger.error(
        `Error al inicializar roles predefinidos: ${error.message}`,
      );
      throw error;
    }
  }

  async verificarPermiso(
    id_usuario: number,
    id_empresa: number,
    recurso: string,
    accion: string,
  ): Promise<boolean> {
    // Obtener roles del usuario en la empresa
    const rolesUsuario = await this.prisma.usuarioRolEmpresa.findMany({
      where: {
        id_usuario,
        RolEmpresa: { id_empresa },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      include: {
        RolEmpresa: {
          include: {
            permisos: true,
          },
        },
      },
    });

    // Verificar permisos en cada rol
    for (const rolUsuario of rolesUsuario) {
      const { RolEmpresa } = rolUsuario;

      // Verificar horarios si están definidos
      if (RolEmpresa.horario_inicio && RolEmpresa.horario_fin) {
        const ahora = new Date();
        const horaActual = ahora.getHours() + ':' + ahora.getMinutes();
        if (
          horaActual < RolEmpresa.horario_inicio ||
          horaActual > RolEmpresa.horario_fin
        ) {
          continue;
        }
      }

      // Verificar permisos
      const tienePermiso = RolEmpresa.permisos.some(
        (permiso) => permiso.recurso === recurso && permiso.accion === accion,
      );

      if (tienePermiso) {
        return true;
      }
    }

    return false;
  }

  async crearRol(
    empresaId: number,
    createRolEmpresaDto: CreateRolEmpresaDto,
  ): Promise<RolEmpresa & { permisos: PermisoRolEmpresa[] }> {
    try {
      const { permisos = [], ...rolData } = createRolEmpresaDto;
      return await this.prisma.rolEmpresa.create({
        data: {
          ...rolData,
          id_empresa: empresaId,
          permisos: {
            create: permisos.map((permiso) => ({
              recurso: permiso.recurso,
              accion: permiso.accion,
              Permiso: {
                connect: {
                  id_permiso: permiso.id_permiso,
                },
              },
            })),
          },
        },
        include: {
          permisos: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un rol con este nombre en la empresa',
        );
      }
      throw error;
    }
  }

  async asignarPermiso(
    empresaId: number,
    asignarPermisoDto: AsignarPermisoRolEmpresaDto,
  ) {
    const { rol_id, permiso_id } = asignarPermisoDto;

    // Verificar que el rol pertenece a la empresa
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: rol_id,
        id_empresa: empresaId,
      },
    });

    if (!rol) {
      throw new NotFoundException(
        `Rol con ID ${rol_id} no encontrado en la empresa`,
      );
    }

    // Verificar que el permiso existe
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: permiso_id },
    });

    if (!permiso) {
      throw new NotFoundException(`Permiso con ID ${permiso_id} no encontrado`);
    }

    try {
      return await this.prisma.permisoRolEmpresa.create({
        data: {
          id_rol: rol_id,
          permiso_id,
          recurso: permiso.recurso,
          accion: permiso.accion,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('El permiso ya está asignado a este rol');
      }
      throw error;
    }
  }

  async obtenerRol(empresaId: number, rolId: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: rolId,
        id_empresa: empresaId,
      },
      include: {
        permisos: {
          include: {
            Permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException(
        `Rol con ID ${rolId} no encontrado en la empresa`,
      );
    }

    return rol;
  }

  async actualizarRol(
    empresaId: number,
    rolId: number,
    updateRolEmpresaDto: UpdateRolEmpresaDto,
  ): Promise<RolEmpresa & { permisos: PermisoRolEmpresa[] }> {
    const rol = await this.obtenerRol(empresaId, rolId);
    const { permisos, ...rolData } = updateRolEmpresaDto;

    return this.prisma.rolEmpresa.update({
      where: { id_rol: rol.id_rol },
      data: {
        ...rolData,
        permisos: permisos
          ? {
              deleteMany: {},
              create: permisos.map((permiso) => ({
                recurso: permiso.recurso,
                accion: permiso.accion,
                Permiso: {
                  connect: {
                    id_permiso: permiso.id_permiso,
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        permisos: true,
      },
    });
  }

  async eliminarRol(empresaId: number, rolId: number) {
    const rol = await this.obtenerRol(empresaId, rolId);

    // Verificar si hay usuarios asignados a este rol
    const usuariosConRol = await this.prisma.usuarioEmpresa.count({
      where: { rol_empresa_id: rolId },
    });

    if (usuariosConRol > 0) {
      throw new BadRequestException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    return this.prisma.rolEmpresa.delete({
      where: { id_rol: rol.id_rol },
    });
  }

  async eliminarPermiso(empresaId: number, rolId: number, permisoId: number) {
    // Verificar que el rol pertenece a la empresa
    await this.obtenerRol(empresaId, rolId);

    try {
      return await this.prisma.permisoRolEmpresa.deleteMany({
        where: {
          id_rol: rolId,
          permiso_id: permisoId,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('La asignación de permiso no existe');
      }
      throw error;
    }
  }
}
