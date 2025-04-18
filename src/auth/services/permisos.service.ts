import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermisoDto } from '../dto/create-permiso.dto';
import { AsignarPermisoDto } from '../dto/asignar-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(private readonly prisma: PrismaService) {}

  async crearPermiso(createPermisoDto: CreatePermisoDto) {
    try {
      return await this.prisma.permiso.create({
        data: {
          nombre: createPermisoDto.nombre,
          descripcion: createPermisoDto.descripcion,
          recurso: createPermisoDto.recurso,
          accion: createPermisoDto.accion,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe un permiso con este nombre');
      }
      throw error;
    }
  }

  async asignarPermisoRol(asignarPermisoDto: AsignarPermisoDto) {
    const { rol_id, permiso_id, condiciones } = asignarPermisoDto;

    if (!rol_id) {
      throw new BadRequestException('El ID del rol es requerido');
    }

    // Verificar que el rol existe
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: rol_id },
    });
    if (!rol) {
      throw new NotFoundException(`Rol con ID ${rol_id} no encontrado`);
    }

    // Verificar que el permiso existe
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: permiso_id },
    });
    if (!permiso) {
      throw new NotFoundException(`Permiso con ID ${permiso_id} no encontrado`);
    }

    try {
      return await this.prisma.permisoRol.create({
        data: {
          rol_id,
          permiso_id,
          condiciones: condiciones ? JSON.stringify(condiciones) : null,
        },
        include: {
          rol: true,
          permiso: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Este permiso ya está asignado al rol');
      }
      throw error;
    }
  }

  async asignarPermisoUsuario(asignarPermisoDto: AsignarPermisoDto) {
    const { usuario_id, permiso_id, condiciones } = asignarPermisoDto;

    if (!usuario_id) {
      throw new BadRequestException('El ID del usuario es requerido');
    }

    // Verificar que el usuario existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuario_id },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuario_id} no encontrado`);
    }

    // Verificar que el permiso existe
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: permiso_id },
    });
    if (!permiso) {
      throw new NotFoundException(`Permiso con ID ${permiso_id} no encontrado`);
    }

    try {
      return await this.prisma.permisoUsuario.create({
        data: {
          usuario_id,
          permiso_id,
          condiciones: condiciones ? JSON.stringify(condiciones) : null,
        },
        include: {
          usuario: true,
          permiso: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Este permiso ya está asignado al usuario',
        );
      }
      throw error;
    }
  }

  async obtenerPermisosUsuario(userId: bigint) {
    // Obtener el usuario con su rol
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
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
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Extraer los permisos del rol
    const permisos = usuario.rol.permisos.map((pr) => ({
      id: pr.permiso.id_permiso,
      nombre: pr.permiso.nombre,
      descripcion: pr.permiso.descripcion,
      recurso: pr.permiso.recurso,
      accion: pr.permiso.accion,
      condiciones: pr.condiciones,
    }));

    return permisos;
  }

  async verificarPermiso(usuario_id: bigint, recurso: string, accion: string) {
    const permisos = await this.obtenerPermisosUsuario(usuario_id);

    return permisos.some(
      (permiso) => permiso.recurso === recurso && permiso.accion === accion,
    );
  }

  async eliminarPermisoRol(rol_id: number, permiso_id: number) {
    try {
      return await this.prisma.permisoRol.delete({
        where: {
          rol_id_permiso_id: {
            rol_id,
            permiso_id,
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('La asignación de permiso no existe');
      }
      throw error;
    }
  }

  async eliminarPermisoUsuario(usuario_id: bigint, permiso_id: number) {
    try {
      return await this.prisma.permisoUsuario.delete({
        where: {
          usuario_id_permiso_id: {
            usuario_id,
            permiso_id,
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('La asignación de permiso no existe');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.permiso.findMany({
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async obtenerPermisosRol(rolId: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: rolId },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol.permisos.map((pr) => ({
      id: pr.permiso.id_permiso,
      nombre: pr.permiso.nombre,
      descripcion: pr.permiso.descripcion,
      recurso: pr.permiso.recurso,
      accion: pr.permiso.accion,
      condiciones: pr.condiciones,
    }));
  }

  async asignarPermisoARol(
    rolId: number,
    permisoId: number,
    condiciones?: string,
  ) {
    // Verificar que el rol y el permiso existen
    const [rol, permiso] = await Promise.all([
      this.prisma.rol.findUnique({ where: { id_rol: rolId } }),
      this.prisma.permiso.findUnique({ where: { id_permiso: permisoId } }),
    ]);

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Verificar si ya existe la asignación
    const asignacionExistente = await this.prisma.permisoRol.findUnique({
      where: {
        rol_id_permiso_id: {
          rol_id: rolId,
          permiso_id: permisoId,
        },
      },
    });

    if (asignacionExistente) {
      // Si ya existe, actualizar las condiciones si se proporcionan
      if (condiciones !== undefined) {
        return this.prisma.permisoRol.update({
          where: {
            rol_id_permiso_id: {
              rol_id: rolId,
              permiso_id: permisoId,
            },
          },
          data: { condiciones },
          include: { permiso: true },
        });
      }
      return asignacionExistente;
    }

    // Crear la nueva asignación
    return this.prisma.permisoRol.create({
      data: {
        rol_id: rolId,
        permiso_id: permisoId,
        condiciones,
      },
      include: { permiso: true },
    });
  }

  async eliminarPermisoDeRol(rolId: number, permisoId: number) {
    // Verificar que la asignación existe
    const asignacion = await this.prisma.permisoRol.findUnique({
      where: {
        rol_id_permiso_id: {
          rol_id: rolId,
          permiso_id: permisoId,
        },
      },
    });

    if (!asignacion) {
      throw new NotFoundException('Asignación de permiso no encontrada');
    }

    // Eliminar la asignación
    await this.prisma.permisoRol.delete({
      where: {
        rol_id_permiso_id: {
          rol_id: rolId,
          permiso_id: permisoId,
        },
      },
    });

    return { message: 'Permiso eliminado correctamente' };
  }
}
