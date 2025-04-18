import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermisoDto } from '../dto/create-permiso.dto';
import { UpdatePermisoDto } from '../dto/update-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPermisoDto: CreatePermisoDto) {
    return this.prisma.permiso.create({
      data: {
        nombre: createPermisoDto.nombre,
        descripcion: createPermisoDto.descripcion,
        recurso: createPermisoDto.recurso,
        accion: createPermisoDto.accion,
      },
    });
  }

  async findAll() {
    return this.prisma.permiso.findMany({
      include: {
        PermisoRol: {
          include: {
            Rol: true,
          },
        },
        PermisoUsuario: {
          include: {
            Usuario: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: id },
      include: {
        PermisoRol: {
          include: {
            Rol: true,
          },
        },
        PermisoUsuario: {
          include: {
            Usuario: true,
          },
        },
      },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return permiso;
  }

  async update(id: number, updatePermisoDto: UpdatePermisoDto) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: id },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return this.prisma.permiso.update({
      where: { id_permiso: id },
      data: {
        nombre: updatePermisoDto.nombre,
        descripcion: updatePermisoDto.descripcion,
        recurso: updatePermisoDto.recurso,
        accion: updatePermisoDto.accion,
      },
    });
  }

  async remove(id: number) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: id },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Eliminar relaciones primero
    await this.prisma.permisoRol.deleteMany({
      where: { permiso_id: id },
    });

    await this.prisma.permisoUsuario.deleteMany({
      where: { permiso_id: id },
    });

    // Eliminar el permiso
    await this.prisma.permiso.delete({
      where: { id_permiso: id },
    });

    return { message: 'Permiso eliminado correctamente' };
  }

  async asignarPermisoRol(permisoId: number, rolId: number) {
    return this.prisma.permisoRol.create({
      data: {
        permiso_id: permisoId,
        rol_id: rolId,
      },
      include: {
        Permiso: true,
        Rol: true,
      },
    });
  }

  async asignarPermisoUsuario(permisoId: number, usuarioId: number) {
    return this.prisma.permisoUsuario.create({
      data: {
        permiso_id: permisoId,
        usuario_id: usuarioId,
      },
      include: {
        Permiso: true,
        Usuario: true,
      },
    });
  }

  async removerPermisoRol(permisoId: number, rolId: number) {
    return this.prisma.permisoRol.delete({
      where: {
        rol_id_permiso_id: {
          permiso_id: permisoId,
          rol_id: rolId,
        },
      },
    });
  }

  async removerPermisoUsuario(permisoId: number, usuarioId: number) {
    return this.prisma.permisoUsuario.delete({
      where: {
        usuario_id_permiso_id: {
          permiso_id: permisoId,
          usuario_id: usuarioId,
        },
      },
    });
  }

  async obtenerPermisosUsuario(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: {
        permisos_usuario: {
          include: {
            Permiso: true,
          },
        },
        empresas: {
          include: {
            empresa: {
              include: {
                roles_empresa: {
                  include: {
                    permisos: {
                      include: {
                        Permiso: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        rol: {
          include: {
            PermisoRol: {
              include: {
                Permiso: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener permisos directos del usuario
    const permisosDirectos = usuario.permisos_usuario.map((pu) => pu.Permiso);

    // Obtener permisos del rol
    const permisosRol = usuario.rol.PermisoRol.map((pr) => pr.Permiso);

    // Obtener permisos de las empresas
    const permisosEmpresas = usuario.empresas.flatMap((ue) =>
      ue.empresa.roles_empresa.flatMap((re) =>
        re.permisos.map((pre) => pre.Permiso),
      ),
    );

    // Combinar todos los permisos y eliminar duplicados
    const todosLosPermisos = [
      ...permisosDirectos,
      ...permisosRol,
      ...permisosEmpresas,
    ];

    const permisosUnicos = todosLosPermisos.filter(
      (permiso, index, self) =>
        index === self.findIndex((p) => p.id_permiso === permiso.id_permiso),
    );

    return permisosUnicos;
  }

  async obtenerPermisosRol(rolId: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: rolId },
      include: {
        PermisoRol: {
          include: {
            Permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol.PermisoRol.map((pr) => pr.Permiso);
  }

  async verificarPermisoUsuario(
    id_usuario: number,
    recurso: string,
    accion: string,
  ): Promise<boolean> {
    const permisos = await this.prisma.permisoUsuario.findMany({
      where: {
        usuario_id: id_usuario,
        Permiso: {
          recurso,
          accion,
        },
      },
    });

    return permisos.length > 0;
  }
}
