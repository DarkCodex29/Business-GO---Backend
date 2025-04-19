import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesPredefinidosConfig } from '../config/roles-predefinidos.config';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.inicializarRolesGlobales();
  }

  private async inicializarRolesGlobales() {
    for (const rol of Object.values(RolesPredefinidosConfig.ROLES_GLOBALES)) {
      await this.prisma.rol.upsert({
        where: { nombre: rol.nombre },
        update: { descripcion: rol.descripcion },
        create: {
          nombre: rol.nombre,
          descripcion: rol.descripcion,
        },
      });
    }
  }

  async inicializarRolesEmpresa(empresaId: number) {
    for (const rol of Object.values(RolesPredefinidosConfig.ROLES_EMPRESA)) {
      // Crear el rol de empresa
      const rolEmpresa = await this.prisma.rolEmpresa.upsert({
        where: {
          nombre_id_empresa: {
            nombre: rol.nombre,
            id_empresa: empresaId,
          },
        },
        update: {
          descripcion: rol.descripcion,
        },
        create: {
          nombre: rol.nombre,
          descripcion: rol.descripcion,
          id_empresa: empresaId,
        },
      });

      // Asignar permisos al rol
      for (const permiso of rol.permisos) {
        const [recurso, accion] = permiso.split('.');

        // Primero crear o obtener el permiso
        const permisoBase = await this.prisma.permiso.upsert({
          where: {
            nombre: permiso,
          },
          update: {},
          create: {
            nombre: permiso,
            descripcion: `Permiso para ${accion} en ${recurso}`,
            recurso,
            accion,
          },
        });

        // Luego crear el permiso para el rol de empresa
        await this.prisma.permisoRolEmpresa.upsert({
          where: {
            id_rol_recurso_accion: {
              id_rol: rolEmpresa.id_rol,
              recurso,
              accion,
            },
          },
          update: {},
          create: {
            id_rol: rolEmpresa.id_rol,
            recurso,
            accion,
            permiso_id: permisoBase.id_permiso,
          },
        });
      }
    }
  }

  async obtenerRolesGlobales() {
    return this.prisma.rol.findMany();
  }

  async obtenerRolesEmpresa(empresaId: number) {
    return this.prisma.rolEmpresa.findMany({
      where: { id_empresa: empresaId },
      include: {
        permisos: true,
      },
    });
  }

  async obtenerPermisosRol(rolId: number) {
    return this.prisma.permisoRolEmpresa.findMany({
      where: { id_rol: rolId },
    });
  }

  async asignarPermisoRol(rolId: number, recurso: string, accion: string) {
    // Primero crear o obtener el permiso base
    const permisoBase = await this.prisma.permiso.upsert({
      where: {
        nombre: `${recurso}.${accion}`,
      },
      update: {},
      create: {
        nombre: `${recurso}.${accion}`,
        descripcion: `Permiso para ${accion} en ${recurso}`,
        recurso,
        accion,
      },
    });

    // Luego crear el permiso para el rol
    return this.prisma.permisoRolEmpresa.create({
      data: {
        id_rol: rolId,
        recurso,
        accion,
        permiso_id: permisoBase.id_permiso,
      },
    });
  }

  async removerPermisoRol(rolId: number, recurso: string, accion: string) {
    return this.prisma.permisoRolEmpresa.delete({
      where: {
        id_rol_recurso_accion: {
          id_rol: rolId,
          recurso,
          accion,
        },
      },
    });
  }
}
