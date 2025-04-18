import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRolEmpresaDto } from '../dto/create-rol-empresa.dto';
import { UpdateRolEmpresaDto } from '../dto/update-rol-empresa.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { rolesPredefinidos } from '../config/roles-predefinidos.config';
import { RolEmpresa, PermisoRolEmpresa } from '@prisma/client';

@Injectable()
export class RolesEmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async crearRolEmpresa(
    id_empresa: string,
    createRolDto: CreateRolEmpresaDto,
  ): Promise<RolEmpresa & { permisos: PermisoRolEmpresa[] }> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: BigInt(id_empresa) },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar si ya existe un rol con el mismo nombre en la empresa
    const rolExistente = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_empresa: BigInt(id_empresa),
        nombre: createRolDto.nombre,
      },
    });

    if (rolExistente) {
      throw new BadRequestException(
        'Ya existe un rol con ese nombre en la empresa',
      );
    }

    // Crear el rol con sus permisos
    return this.prisma.rolEmpresa.create({
      data: {
        nombre: createRolDto.nombre,
        descripcion: createRolDto.descripcion,
        id_empresa: BigInt(id_empresa),
        horario_inicio: createRolDto.horario_inicio,
        horario_fin: createRolDto.horario_fin,
        fecha_inicio: createRolDto.fecha_inicio
          ? new Date(createRolDto.fecha_inicio)
          : null,
        fecha_fin: createRolDto.fecha_fin
          ? new Date(createRolDto.fecha_fin)
          : null,
        permisos: {
          create:
            createRolDto.permisos?.map((permiso) => ({
              recurso: permiso.recurso,
              accion: permiso.accion,
              permiso: {
                connect: {
                  id_permiso: permiso.id_permiso,
                },
              },
            })) || [],
        },
      },
      include: {
        permisos: true,
      },
    });
  }

  async asignarRolAUsuario(
    id_empresa: string,
    id_usuario: string,
    id_rol: string,
    fecha_inicio?: Date,
    fecha_fin?: Date,
  ) {
    // Verificar que el usuario pertenece a la empresa
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        empresa: { id_empresa: BigInt(id_empresa) },
        usuario: { id_usuario: BigInt(id_usuario) },
      },
    });

    if (!usuarioEmpresa) {
      throw new BadRequestException('El usuario no pertenece a esta empresa');
    }

    // Verificar que el rol existe y pertenece a la empresa
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: BigInt(id_rol),
        id_empresa: BigInt(id_empresa),
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Verificar si ya tiene el rol asignado
    const rolAsignado = await this.prisma.usuarioRolEmpresa.findFirst({
      where: {
        id_usuario: BigInt(id_usuario),
        id_rol: BigInt(id_rol),
      },
    });

    if (rolAsignado) {
      throw new BadRequestException('El usuario ya tiene asignado este rol');
    }

    // Asignar el rol al usuario
    return this.prisma.usuarioRolEmpresa.create({
      data: {
        id_usuario: BigInt(id_usuario),
        id_rol: BigInt(id_rol),
        fecha_inicio: fecha_inicio || new Date(),
        fecha_fin: fecha_fin,
      },
    });
  }

  async obtenerRolesEmpresa(id_empresa: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: BigInt(id_empresa) },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return this.prisma.rolEmpresa.findMany({
      where: { id_empresa: BigInt(id_empresa) },
      include: {
        permisos: true,
        usuarios: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nombre: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async eliminarRolEmpresa(id_empresa: string, id_rol: string) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: BigInt(id_rol),
        id_empresa: BigInt(id_empresa),
      },
      include: {
        usuarios: true,
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (rol.usuarios.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    // Eliminar los permisos del rol primero
    await this.prisma.permisoRolEmpresa.deleteMany({
      where: { id_rol: BigInt(id_rol) },
    });

    // Eliminar el rol
    return this.prisma.rolEmpresa.delete({
      where: { id_rol: BigInt(id_rol) },
    });
  }

  async inicializarRolesPredefinidos(
    id_empresa: string,
  ): Promise<(RolEmpresa & { permisos: PermisoRolEmpresa[] })[]> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: BigInt(id_empresa) },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const rolesConfig =
      rolesPredefinidos[empresa.tipo_empresa] ?? rolesPredefinidos.GENERAL;
    const rolesCreados: (RolEmpresa & { permisos: PermisoRolEmpresa[] })[] = [];

    for (const rolConfig of rolesConfig) {
      const rol = await this.crearRolEmpresa(id_empresa, {
        nombre: rolConfig.nombre,
        descripcion: rolConfig.descripcion,
        permisos:
          rolConfig.permisos.map((permiso) => ({
            ...permiso,
            id_permiso: permiso.id_permiso,
          })) ?? [],
      });
      rolesCreados.push(rol);
    }

    return rolesCreados;
  }

  async verificarPermiso(
    id_usuario: bigint,
    id_empresa: bigint,
    recurso: string,
    accion: string,
  ): Promise<boolean> {
    // Obtener roles del usuario en la empresa
    const rolesUsuario = await this.prisma.usuarioRolEmpresa.findMany({
      where: {
        id_usuario,
        rol: { id_empresa },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      include: {
        rol: {
          include: {
            permisos: true,
          },
        },
      },
    });

    // Verificar permisos en cada rol
    for (const rolUsuario of rolesUsuario) {
      const { rol } = rolUsuario;

      // Verificar horarios si están definidos
      if (rol.horario_inicio && rol.horario_fin) {
        const ahora = new Date();
        const horaActual = ahora.getHours() + ':' + ahora.getMinutes();
        if (horaActual < rol.horario_inicio || horaActual > rol.horario_fin) {
          continue;
        }
      }

      // Verificar permisos
      const tienePermiso = rol.permisos.some(
        (permiso) => permiso.recurso === recurso && permiso.accion === accion,
      );

      if (tienePermiso) {
        return true;
      }
    }

    return false;
  }

  async crearRol(
    empresaId: bigint,
    createRolEmpresaDto: CreateRolEmpresaDto,
  ): Promise<RolEmpresa & { permisos: PermisoRolEmpresa[] }> {
    try {
      const { permisos, ...rolData } = createRolEmpresaDto;
      return await this.prisma.rolEmpresa.create({
        data: {
          ...rolData,
          id_empresa: empresaId,
          permisos: permisos
            ? {
                create: permisos.map((permiso) => ({
                  recurso: permiso.recurso,
                  accion: permiso.accion,
                  permiso: {
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
    empresaId: bigint,
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

  async obtenerRol(empresaId: bigint, rolId: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: rolId,
        id_empresa: empresaId,
      },
      include: {
        permisos: {
          include: {
            permiso: true,
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
    empresaId: bigint,
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
                permiso: {
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

  async eliminarRol(empresaId: bigint, rolId: number) {
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

  async eliminarPermiso(empresaId: bigint, rolId: number, permisoId: number) {
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
