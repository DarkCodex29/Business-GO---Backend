import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RolMetrics,
  RolUsageStats,
  PermissionDistribution,
} from '../types/roles.types';

@Injectable()
export class RolesCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  // Métricas generales del sistema de roles
  async calculateRolMetrics(): Promise<RolMetrics> {
    // Obtener todos los roles con sus relaciones
    const roles = await this.prisma.rol.findMany({
      include: {
        usuario: true,
        other_Rol: true,
        permisoRol: true,
      },
    });

    const totalRoles = roles.length;
    const rolesConUsuarios = roles.filter(
      (rol) => rol.usuario.length > 0,
    ).length;
    const rolesSinUsuarios = totalRoles - rolesConUsuarios;
    const rolesConHijos = roles.filter(
      (rol) => rol.other_Rol.length > 0,
    ).length;
    const rolesSinHijos = totalRoles - rolesConHijos;

    // Calcular promedio de usuarios por rol
    const totalUsuarios = roles.reduce(
      (sum, rol) => sum + rol.usuario.length,
      0,
    );
    const promedioUsuariosPorRol =
      totalRoles > 0 ? totalUsuarios / totalRoles : 0;

    // Encontrar rol con más usuarios
    let rolConMasUsuarios: {
      id_rol: number;
      nombre: string;
      totalUsuarios: number;
    } | null = null;

    if (roles.length > 0) {
      const rolMaxUsuarios = roles.reduce((max, rol) =>
        rol.usuario.length > max.usuario.length ? rol : max,
      );

      if (rolMaxUsuarios.usuario.length > 0) {
        rolConMasUsuarios = {
          id_rol: rolMaxUsuarios.id_rol,
          nombre: rolMaxUsuarios.nombre,
          totalUsuarios: rolMaxUsuarios.usuario.length,
        };
      }
    }

    // Calcular distribución por jerarquía
    const distribucionJerarquia = await this.calculateHierarchyDistribution();

    return {
      totalRoles,
      rolesConUsuarios,
      rolesSinUsuarios,
      rolesConHijos,
      rolesSinHijos,
      promedioUsuariosPorRol: Math.round(promedioUsuariosPorRol * 100) / 100,
      rolConMasUsuarios,
      distribucionJerarquia,
    };
  }

  // Estadísticas de uso por rol
  async calculateRolUsageStats(): Promise<RolUsageStats[]> {
    const roles = await this.prisma.rol.findMany({
      include: {
        usuario: {
          select: {
            ultimo_acceso: true,
          },
        },
        other_Rol: true,
        permisoRol: true,
        rol: true,
      },
    });

    const statsPromises = roles.map(async (rol) => {
      const nivelJerarquia = await this.calculateRolHierarchyLevel(rol.id_rol);

      // Calcular último acceso de usuarios con este rol
      const ultimosAccesos = rol.usuario
        .map((u) => u.ultimo_acceso)
        .filter((fecha) => fecha !== null) as Date[];

      const ultimoAccesoUsuarios =
        ultimosAccesos.length > 0
          ? new Date(
              Math.max(...ultimosAccesos.map((fecha) => fecha.getTime())),
            )
          : undefined;

      return {
        id_rol: rol.id_rol,
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        totalUsuarios: rol.usuario.length,
        totalPermisos: rol.permisoRol.length,
        esRolPadre: rol.other_Rol.length > 0,
        tieneRolPadre: rol.rol_padre_id !== null,
        nivelJerarquia,
        ultimoAccesoUsuarios,
      };
    });

    return Promise.all(statsPromises);
  }

  // Distribución de permisos entre roles
  async calculatePermissionDistribution(): Promise<PermissionDistribution[]> {
    const permisos = await this.prisma.permiso.findMany({
      include: {
        permisoRol: {
          include: {
            rol: {
              select: {
                id_rol: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    const totalRoles = await this.prisma.rol.count();

    return permisos.map((permiso) => {
      const rolesAsignados = permiso.permisoRol.map((pr) => ({
        id_rol: pr.rol.id_rol,
        nombre: pr.rol.nombre,
      }));

      const totalRolesAsignados = rolesAsignados.length;
      const porcentajeCobertura =
        totalRoles > 0
          ? Math.round((totalRolesAsignados / totalRoles) * 100 * 100) / 100
          : 0;

      return {
        id_permiso: permiso.id_permiso,
        nombre: permiso.nombre,
        descripcion: permiso.descripcion || '',
        totalRolesAsignados,
        porcentajeCobertura,
        rolesAsignados,
      };
    });
  }

  // Análisis de jerarquía de roles
  async analyzeRoleHierarchy(): Promise<{
    maxNivel: number;
    rolesRaiz: number;
    rolesHoja: number;
    cadenasMasLargas: {
      rolRaiz: string;
      niveles: number;
      cadena: string[];
    }[];
  }> {
    const roles = await this.prisma.rol.findMany({
      include: {
        other_Rol: true,
        rol: true,
      },
    });

    // Encontrar roles raíz (sin padre)
    const rolesRaiz = roles.filter((rol) => rol.rol_padre_id === null);

    // Encontrar roles hoja (sin hijos)
    const rolesHoja = roles.filter((rol) => rol.other_Rol.length === 0);

    // Calcular nivel máximo
    let maxNivel = 0;
    const cadenasMasLargas: any[] = [];

    for (const rolRaiz of rolesRaiz) {
      const cadena = await this.buildRoleChain(rolRaiz.id_rol);
      if (cadena.length > maxNivel) {
        maxNivel = cadena.length;
      }

      cadenasMasLargas.push({
        rolRaiz: rolRaiz.nombre,
        niveles: cadena.length,
        cadena: cadena.map((r) => r.nombre),
      });
    }

    // Ordenar cadenas por longitud descendente
    cadenasMasLargas.sort((a, b) => b.niveles - a.niveles);

    return {
      maxNivel,
      rolesRaiz: rolesRaiz.length,
      rolesHoja: rolesHoja.length,
      cadenasMasLargas: cadenasMasLargas.slice(0, 5), // Top 5 cadenas más largas
    };
  }

  // Métricas de actividad de roles
  async calculateRoleActivityMetrics(
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<{
    rolesActivos: number;
    rolesInactivos: number;
    nuevosRoles: number;
    usuariosNuevosPorRol: {
      id_rol: number;
      nombre: string;
      nuevosUsuarios: number;
    }[];
  }> {
    // Roles con usuarios que han tenido actividad en el período
    const rolesConActividad = await this.prisma.rol.findMany({
      where: {
        usuario: {
          some: {
            ultimo_acceso: {
              gte: fechaInicio,
              lte: fechaFin,
            },
          },
        },
      },
      include: {
        usuario: {
          where: {
            fecha_registro: {
              gte: fechaInicio,
              lte: fechaFin,
            },
          },
        },
      },
    });

    const totalRoles = await this.prisma.rol.count();
    const rolesActivos = rolesConActividad.length;
    const rolesInactivos = totalRoles - rolesActivos;

    // Nuevos roles creados en el período (asumiendo que existe fecha_creacion)
    const nuevosRoles = 0; // El schema no tiene fecha_creacion para roles

    // Usuarios nuevos por rol
    const usuariosNuevosPorRol = rolesConActividad.map((rol) => ({
      id_rol: rol.id_rol,
      nombre: rol.nombre,
      nuevosUsuarios: rol.usuario.length,
    }));

    return {
      rolesActivos,
      rolesInactivos,
      nuevosRoles,
      usuariosNuevosPorRol,
    };
  }

  // Análisis de eficiencia de roles
  async analyzeRoleEfficiency(): Promise<{
    rolesSubutilizados: {
      id_rol: number;
      nombre: string;
      totalUsuarios: number;
      totalPermisos: number;
      eficiencia: number;
    }[];
    rolesSobreasignados: {
      id_rol: number;
      nombre: string;
      totalUsuarios: number;
      totalPermisos: number;
      ratio: number;
    }[];
  }> {
    const roles = await this.prisma.rol.findMany({
      include: {
        usuario: true,
        permisoRol: true,
      },
    });

    const rolesConDatos = roles.map((rol) => ({
      id_rol: rol.id_rol,
      nombre: rol.nombre,
      totalUsuarios: rol.usuario.length,
      totalPermisos: rol.permisoRol.length,
      eficiencia:
        rol.permisoRol.length > 0
          ? rol.usuario.length / rol.permisoRol.length
          : 0,
      ratio:
        rol.usuario.length > 0 ? rol.permisoRol.length / rol.usuario.length : 0,
    }));

    // Roles subutilizados (muchos permisos, pocos usuarios)
    const rolesSubutilizados = rolesConDatos
      .filter((rol) => rol.totalPermisos > 5 && rol.eficiencia < 0.5)
      .sort((a, b) => a.eficiencia - b.eficiencia)
      .slice(0, 10);

    // Roles sobreasignados (muchos permisos por usuario)
    const rolesSobreasignados = rolesConDatos
      .filter((rol) => rol.totalUsuarios > 0 && rol.ratio > 10)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    return {
      rolesSubutilizados,
      rolesSobreasignados,
    };
  }

  // Métodos auxiliares privados
  private async calculateHierarchyDistribution(): Promise<
    { nivel: number; cantidad: number }[]
  > {
    const roles = await this.prisma.rol.findMany();
    const distribucion = new Map<number, number>();

    for (const rol of roles) {
      const nivel = await this.calculateRolHierarchyLevel(rol.id_rol);
      distribucion.set(nivel, (distribucion.get(nivel) || 0) + 1);
    }

    return Array.from(distribucion.entries())
      .map(([nivel, cantidad]) => ({ nivel, cantidad }))
      .sort((a, b) => a.nivel - b.nivel);
  }

  private async calculateRolHierarchyLevel(rolId: number): Promise<number> {
    let nivel = 0;
    let currentRolId = rolId;

    while (currentRolId) {
      const rol = await this.prisma.rol.findUnique({
        where: { id_rol: currentRolId },
        select: { rol_padre_id: true },
      });

      if (!rol || !rol.rol_padre_id) {
        break;
      }

      nivel++;
      currentRolId = rol.rol_padre_id;

      // Prevenir bucles infinitos
      if (nivel > 10) {
        break;
      }
    }

    return nivel;
  }

  private async buildRoleChain(
    rolId: number,
  ): Promise<{ id_rol: number; nombre: string }[]> {
    const cadena: { id_rol: number; nombre: string }[] = [];
    const visitados = new Set<number>();

    const buildChainRecursive = async (currentRolId: number): Promise<void> => {
      if (visitados.has(currentRolId)) {
        return; // Evitar bucles infinitos
      }

      visitados.add(currentRolId);

      const rol = await this.prisma.rol.findUnique({
        where: { id_rol: currentRolId },
        include: {
          other_Rol: {
            select: {
              id_rol: true,
              nombre: true,
            },
          },
        },
      });

      if (rol) {
        cadena.push({
          id_rol: rol.id_rol,
          nombre: rol.nombre,
        });

        // Continuar con el primer hijo (si existe)
        if (rol.other_Rol.length > 0) {
          await buildChainRecursive(rol.other_Rol[0].id_rol);
        }
      }
    };

    await buildChainRecursive(rolId);
    return cadena;
  }

  // Reporte de roles órfanos y problemáticos
  async findProblematicRoles(): Promise<{
    rolesOrfanos: { id_rol: number; nombre: string }[];
    rolesSinPermisos: { id_rol: number; nombre: string }[];
    rolesSinUsuarios: { id_rol: number; nombre: string }[];
    rolesConReferenciasCirculares: { id_rol: number; nombre: string }[];
  }> {
    const roles = await this.prisma.rol.findMany({
      include: {
        usuario: true,
        permisoRol: true,
        rol: true,
      },
    });

    // Roles órfanos (referencia a rol padre que no existe)
    const rolesOrfanos: { id_rol: number; nombre: string }[] = [];

    for (const rol of roles) {
      if (rol.rol_padre_id) {
        const padreExiste = roles.some((r) => r.id_rol === rol.rol_padre_id);
        if (!padreExiste) {
          rolesOrfanos.push({
            id_rol: rol.id_rol,
            nombre: rol.nombre,
          });
        }
      }
    }

    // Roles sin permisos
    const rolesSinPermisos = roles
      .filter((rol) => rol.permisoRol.length === 0)
      .map((rol) => ({
        id_rol: rol.id_rol,
        nombre: rol.nombre,
      }));

    // Roles sin usuarios
    const rolesSinUsuarios = roles
      .filter((rol) => rol.usuario.length === 0)
      .map((rol) => ({
        id_rol: rol.id_rol,
        nombre: rol.nombre,
      }));

    // Roles con referencias circulares
    const rolesConReferenciasCirculares: { id_rol: number; nombre: string }[] =
      [];

    for (const rol of roles) {
      if (await this.hasCircularReference(rol.id_rol)) {
        rolesConReferenciasCirculares.push({
          id_rol: rol.id_rol,
          nombre: rol.nombre,
        });
      }
    }

    return {
      rolesOrfanos,
      rolesSinPermisos,
      rolesSinUsuarios,
      rolesConReferenciasCirculares,
    };
  }

  private async hasCircularReference(rolId: number): Promise<boolean> {
    const visitados = new Set<number>();
    let currentRolId = rolId;

    while (currentRolId) {
      if (visitados.has(currentRolId)) {
        return true; // Referencia circular detectada
      }

      visitados.add(currentRolId);

      const rol = await this.prisma.rol.findUnique({
        where: { id_rol: currentRolId },
        select: { rol_padre_id: true },
      });

      currentRolId = rol?.rol_padre_id ?? 0;
      if (currentRolId === 0) currentRolId = 0;

      // Límite de seguridad
      if (visitados.size > 50) {
        return true;
      }
    }

    return false;
  }
}
