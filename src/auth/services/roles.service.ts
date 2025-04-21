import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesPredefinidosConfig } from '../../common/config/roles-predefinidos.config';
import { RoleType } from '../../common/constants/roles.constant';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeRoles() {
    const roles = RolesPredefinidosConfig.ROLES_PREDEFINIDOS;

    for (const [nombre, config] of Object.entries(roles)) {
      await this.prisma.rol.upsert({
        where: { nombre },
        update: {
          descripcion: config.descripcion,
        },
        create: {
          nombre,
          descripcion: config.descripcion,
        },
      });

      // Crear permisos para el rol
      for (const permiso of config.permisos) {
        const [recurso, accion] = permiso.split(':');

        // Crear el permiso si no existe
        const permisoCreado = await this.prisma.permiso.upsert({
          where: {
            nombre: permiso,
          },
          update: {},
          create: {
            nombre: permiso,
            recurso,
            accion,
            descripcion: `Permiso para ${accion} en ${recurso}`,
          },
        });

        // Asociar el permiso al rol
        await this.prisma.permisoRol.upsert({
          where: {
            rol_id_permiso_id: {
              rol_id:
                (await this.prisma.rol.findUnique({ where: { nombre } }))
                  ?.id_rol ??
                (
                  await this.prisma.rol.create({
                    data: { nombre, descripcion: config.descripcion },
                  })
                ).id_rol,
              permiso_id: permisoCreado.id_permiso,
            },
          },
          update: {},
          create: {
            rol: {
              connect: { nombre },
            },
            permiso: {
              connect: { id_permiso: permisoCreado.id_permiso },
            },
          },
        });
      }
    }
  }

  async getRolesPredefinidos() {
    return RolesPredefinidosConfig.ROLES_PREDEFINIDOS;
  }

  async createRolGlobal(data: {
    nombre: string;
    descripcion?: string;
    permisos: string[];
  }) {
    const rol = await this.prisma.rol.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    });

    // Crear y asociar permisos
    for (const permiso of data.permisos) {
      const [recurso, accion] = permiso.split(':');

      const permisoCreado = await this.prisma.permiso.upsert({
        where: { nombre: permiso },
        update: {},
        create: {
          nombre: permiso,
          recurso,
          accion,
          descripcion: `Permiso para ${accion} en ${recurso}`,
        },
      });

      await this.prisma.permisoRol.create({
        data: {
          rol: { connect: { id_rol: rol.id_rol } },
          permiso: { connect: { id_permiso: permisoCreado.id_permiso } },
        },
      });
    }

    return rol;
  }

  async createRolEmpresa(data: {
    nombre: string;
    descripcion?: string;
    id_empresa: number;
    permisos: string[];
  }) {
    const rol = await this.prisma.rolEmpresa.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        id_empresa: data.id_empresa,
      },
    });

    // Crear y asociar permisos
    for (const permiso of data.permisos) {
      const [recurso, accion] = permiso.split(':');

      const permisoCreado = await this.prisma.permiso.upsert({
        where: { nombre: permiso },
        update: {},
        create: {
          nombre: permiso,
          recurso,
          accion,
          descripcion: `Permiso para ${accion} en ${recurso}`,
        },
      });

      await this.prisma.permisoRolEmpresa.create({
        data: {
          id_rol: rol.id_rol,
          recurso,
          accion,
          permiso_id: permisoCreado.id_permiso,
        },
      });
    }

    return rol;
  }

  async updateRolGlobal(
    id: number,
    data: { nombre?: string; descripcion?: string; permisos?: string[] },
  ) {
    const rol = await this.prisma.rol.update({
      where: { id_rol: id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    });

    if (data.permisos) {
      // Eliminar permisos existentes
      await this.prisma.permisoRol.deleteMany({
        where: { rol_id: id },
      });

      // Crear nuevos permisos
      for (const permiso of data.permisos) {
        const [recurso, accion] = permiso.split(':');

        const permisoCreado = await this.prisma.permiso.upsert({
          where: { nombre: permiso },
          update: {},
          create: {
            nombre: permiso,
            recurso,
            accion,
            descripcion: `Permiso para ${accion} en ${recurso}`,
          },
        });

        await this.prisma.permisoRol.create({
          data: {
            rol: { connect: { id_rol: id } },
            permiso: { connect: { id_permiso: permisoCreado.id_permiso } },
          },
        });
      }
    }

    return rol;
  }

  async updateRolEmpresa(
    id: number,
    data: {
      nombre?: string;
      descripcion?: string;
      permisos?: string[];
    },
  ) {
    const rol = await this.prisma.rolEmpresa.update({
      where: { id_rol: id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    });

    if (data.permisos) {
      // Eliminar permisos existentes
      await this.prisma.permisoRolEmpresa.deleteMany({
        where: { id_rol: id },
      });

      // Crear nuevos permisos
      for (const permiso of data.permisos) {
        const [recurso, accion] = permiso.split(':');

        const permisoCreado = await this.prisma.permiso.upsert({
          where: { nombre: permiso },
          update: {},
          create: {
            nombre: permiso,
            recurso,
            accion,
            descripcion: `Permiso para ${accion} en ${recurso}`,
          },
        });

        await this.prisma.permisoRolEmpresa.create({
          data: {
            id_rol: id,
            recurso,
            accion,
            permiso_id: permisoCreado.id_permiso,
          },
        });
      }
    }

    return rol;
  }

  async deleteRolGlobal(id: number) {
    // Eliminar permisos asociados
    await this.prisma.permisoRol.deleteMany({
      where: { rol_id: id },
    });

    return this.prisma.rol.delete({
      where: { id_rol: id },
    });
  }

  async deleteRolEmpresa(id: number) {
    // Eliminar permisos asociados
    await this.prisma.permisoRolEmpresa.deleteMany({
      where: { id_rol: id },
    });

    return this.prisma.rolEmpresa.delete({
      where: { id_rol: id },
    });
  }

  async getRolesEmpresa(idEmpresa: number) {
    return this.prisma.rolEmpresa.findMany({
      where: { id_empresa: idEmpresa },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async getRolesGlobales() {
    return this.prisma.rol.findMany({
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async clonarRolPredefinido(nombreRol: RoleType, idEmpresa: number) {
    const rolPredefinido =
      RolesPredefinidosConfig.ROLES_PREDEFINIDOS[nombreRol];
    if (!rolPredefinido) {
      throw new Error(`Rol predefinido ${nombreRol} no encontrado`);
    }

    return this.createRolEmpresa({
      nombre: `${nombreRol}_${idEmpresa}`,
      descripcion: rolPredefinido.descripcion,
      id_empresa: idEmpresa,
      permisos: Array.from(rolPredefinido.permisos),
    });
  }
}
