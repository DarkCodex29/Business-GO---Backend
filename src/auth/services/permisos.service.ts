import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermisoDto } from '../dto/create-permiso.dto';
import { UpdatePermisoDto } from '../dto/update-permiso.dto';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class PermisosService extends BaseCrudService<
  any,
  CreatePermisoDto,
  UpdatePermisoDto
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'permiso', 'Permiso');
  }

  protected getModel() {
    return this.prisma.permiso;
  }

  protected getIdField(id: number) {
    return { id_permiso: id };
  }

  async create(createPermisoDto: CreatePermisoDto) {
    try {
      const permiso = await this.prisma.permiso.create({
        data: {
          nombre: createPermisoDto.nombre,
          descripcion: createPermisoDto.descripcion,
          recurso: createPermisoDto.recurso,
          accion: createPermisoDto.accion,
        },
      });

      this.logOperation('Crear', permiso.id_permiso, {
        nombre: permiso.nombre,
      });
      return permiso;
    } catch (error) {
      this.handleError('crear', error);
    }
  }

  async findAll() {
    return this.prisma.permiso.findMany({
      include: {
        permisoRol: {
          include: {
            rol: true,
          },
        },
        permisoUsuario: {
          include: {
            usuario: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.findByIdOrThrow(id, {
      permisoRol: {
        include: {
          rol: true,
        },
      },
      permisoUsuario: {
        include: {
          usuario: true,
        },
      },
    });
  }

  async update(id: number, updatePermisoDto: UpdatePermisoDto) {
    try {
      await this.existsOrThrow(id);

      const permiso = await this.prisma.permiso.update({
        where: { id_permiso: id },
        data: {
          nombre: updatePermisoDto.nombre,
          descripcion: updatePermisoDto.descripcion,
          recurso: updatePermisoDto.recurso,
          accion: updatePermisoDto.accion,
        },
      });

      this.logOperation('Actualizar', id, updatePermisoDto);
      return permiso;
    } catch (error) {
      this.handleError('actualizar', error, id);
    }
  }

  async remove(id: number) {
    try {
      await this.existsOrThrow(id);

      // Usar transacción para garantizar consistencia
      await this.prisma.$transaction(async (tx) => {
        // Eliminar relaciones primero
        await tx.permisoRol.deleteMany({
          where: { permiso_id: id },
        });

        await tx.permisoUsuario.deleteMany({
          where: { permiso_id: id },
        });

        // Eliminar el permiso
        await tx.permiso.delete({
          where: { id_permiso: id },
        });
      });

      this.logOperation('Eliminar', id);
      return { message: 'Permiso eliminado correctamente' };
    } catch (error) {
      this.handleError('eliminar', error, id);
    }
  }

  async asignarPermisoRol(permisoId: number, rolId: number) {
    return this.prisma.permisoRol.create({
      data: {
        permiso_id: permisoId,
        rol_id: rolId,
      },
      include: {
        permiso: true,
        rol: true,
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
        permiso: true,
        usuario: true,
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
            permiso: true,
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
                        permiso: true,
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
            permisoRol: {
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

    // Obtener permisos directos del usuario
    const permisosDirectos = usuario.permisos_usuario.map((pu) => pu.permiso);

    // Obtener permisos del rol
    const permisosRol = usuario.rol.permisoRol.map((pr) => pr.permiso);

    // Obtener permisos de las empresas
    const permisosEmpresas = usuario.empresas.flatMap((ue) =>
      ue.empresa.roles_empresa.flatMap((re) =>
        re.permisos.map((pre) => pre.permiso),
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
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol.permisoRol.map((pr) => pr.permiso);
  }

  async verificarPermisoUsuario(
    id_usuario: number,
    recurso: string,
    accion: string,
  ): Promise<boolean> {
    const permisos = await this.prisma.permisoUsuario.findMany({
      where: {
        usuario_id: id_usuario,
        permiso: {
          recurso,
          accion,
        },
      },
    });

    return permisos.length > 0;
  }
}
