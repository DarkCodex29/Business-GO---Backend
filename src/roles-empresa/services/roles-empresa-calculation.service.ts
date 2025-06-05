import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RolEmpresaMetrics {
  totalRolesEmpresa: number;
  rolesConUsuarios: number;
  rolesSinUsuarios: number;
  promedioUsuariosPorRol: number;
  empresaConMasRoles: {
    id_empresa: number;
    nombre: string;
    totalRoles: number;
  } | null;
  distribucionPorEmpresa: {
    id_empresa: number;
    nombre: string;
    totalRoles: number;
    usuariosActivos: number;
  }[];
}

interface RolEmpresaUsageStats {
  id_rol: number;
  nombre: string;
  descripcion: string;
  empresa: {
    id_empresa: number;
    nombre: string;
  };
  totalUsuarios: number;
  totalPermisos: number;
  usuariosActivos: number;
  fechaCreacion?: Date;
  ultimaAsignacion?: Date;
}

interface EmpresaRoleDistribution {
  id_empresa: number;
  nombre: string;
  totalRoles: number;
  totalUsuarios: number;
  rolesActivos: number;
  rolesInactivos: number;
  roles: {
    id_rol: number;
    nombre: string;
    totalUsuarios: number;
    activo: boolean;
  }[];
}

@Injectable()
export class RolesEmpresaCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  // Métricas generales de roles de empresa
  async calculateRolEmpresaMetrics(): Promise<RolEmpresaMetrics> {
    // Obtener todos los roles de empresa con sus relaciones
    const rolesEmpresa = await this.prisma.rolEmpresa.findMany({
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
          },
        },
        usuarios: {
          where: {
            OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
          },
        },
        permisos: true,
      },
    });

    const totalRolesEmpresa = rolesEmpresa.length;
    const rolesConUsuarios = rolesEmpresa.filter(
      (rol) => rol.usuarios.length > 0,
    ).length;
    const rolesSinUsuarios = totalRolesEmpresa - rolesConUsuarios;

    // Calcular promedio de usuarios por rol
    const totalUsuarios = rolesEmpresa.reduce(
      (sum, rol) => sum + rol.usuarios.length,
      0,
    );
    const promedioUsuariosPorRol =
      totalRolesEmpresa > 0 ? totalUsuarios / totalRolesEmpresa : 0;

    // Encontrar empresa con más roles
    const empresasRoles = new Map<number, { nombre: string; count: number }>();
    rolesEmpresa.forEach((rol) => {
      const empresaId = rol.empresa.id_empresa;
      const existing = empresasRoles.get(empresaId);
      if (existing) {
        existing.count++;
      } else {
        empresasRoles.set(empresaId, {
          nombre: rol.empresa.nombre,
          count: 1,
        });
      }
    });

    let empresaConMasRoles: {
      id_empresa: number;
      nombre: string;
      totalRoles: number;
    } | null = null;

    if (empresasRoles.size > 0) {
      const [empresaId, data] = Array.from(empresasRoles.entries()).reduce(
        (max, current) => (current[1].count > max[1].count ? current : max),
      );
      empresaConMasRoles = {
        id_empresa: empresaId,
        nombre: data.nombre,
        totalRoles: data.count,
      };
    }

    // Distribución por empresa
    const distribucionPorEmpresa = Array.from(empresasRoles.entries()).map(
      ([empresaId, data]) => {
        const usuariosActivos = rolesEmpresa
          .filter((rol) => rol.empresa.id_empresa === empresaId)
          .reduce((sum, rol) => sum + rol.usuarios.length, 0);

        return {
          id_empresa: empresaId,
          nombre: data.nombre,
          totalRoles: data.count,
          usuariosActivos,
        };
      },
    );

    return {
      totalRolesEmpresa,
      rolesConUsuarios,
      rolesSinUsuarios,
      promedioUsuariosPorRol: Math.round(promedioUsuariosPorRol * 100) / 100,
      empresaConMasRoles,
      distribucionPorEmpresa: distribucionPorEmpresa.sort(
        (a, b) => b.totalRoles - a.totalRoles,
      ),
    };
  }

  // Estadísticas de uso por rol de empresa
  async calculateRolEmpresaUsageStats(): Promise<RolEmpresaUsageStats[]> {
    const rolesEmpresa = await this.prisma.rolEmpresa.findMany({
      include: {
        empresa: {
          select: {
            id_empresa: true,
            nombre: true,
          },
        },
        usuarios: {
          where: {
            OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
          },
          select: {
            fecha_inicio: true,
          },
        },
        permisos: true,
      },
    });

    return rolesEmpresa.map((rol) => {
      // Calcular última asignación
      const ultimaAsignacion =
        rol.usuarios.length > 0
          ? new Date(
              Math.max(...rol.usuarios.map((ur) => ur.fecha_inicio.getTime())),
            )
          : undefined;

      return {
        id_rol: rol.id_rol,
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        empresa: {
          id_empresa: rol.empresa.id_empresa,
          nombre: rol.empresa.nombre,
        },
        totalUsuarios: rol.usuarios.length,
        totalPermisos: rol.permisos.length,
        usuariosActivos: rol.usuarios.length,
        ultimaAsignacion,
      };
    });
  }

  // Distribución de roles por empresa
  async calculateEmpresaRoleDistribution(): Promise<EmpresaRoleDistribution[]> {
    const empresas = await this.prisma.empresa.findMany({
      include: {
        roles_empresa: {
          include: {
            usuarios: {
              where: {
                OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
              },
            },
          },
        },
      },
    });

    return empresas.map((empresa) => {
      const rolesActivos = empresa.roles_empresa.filter(
        (rol) => rol.usuarios.length > 0,
      ).length;
      const rolesInactivos = empresa.roles_empresa.length - rolesActivos;
      const totalUsuarios = empresa.roles_empresa.reduce(
        (sum, rol) => sum + rol.usuarios.length,
        0,
      );

      const roles = empresa.roles_empresa.map((rol) => ({
        id_rol: rol.id_rol,
        nombre: rol.nombre,
        totalUsuarios: rol.usuarios.length,
        activo: rol.usuarios.length > 0,
      }));

      return {
        id_empresa: empresa.id_empresa,
        nombre: empresa.nombre,
        totalRoles: empresa.roles_empresa.length,
        totalUsuarios,
        rolesActivos,
        rolesInactivos,
        roles: roles.sort((a, b) => b.totalUsuarios - a.totalUsuarios),
      };
    });
  }

  // Análisis de actividad de roles por empresa
  async calculateRoleActivityByEmpresa(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<{
    rolesActivos: number;
    rolesInactivos: number;
    nuevasAsignaciones: number;
    asignacionesFinalizadas: number;
    usuariosConRolActivo: number;
    distribucionPorRol: {
      id_rol: number;
      nombre: string;
      nuevasAsignaciones: number;
      asignacionesActivas: number;
    }[];
  }> {
    // Roles de la empresa
    const rolesEmpresa = await this.prisma.rolEmpresa.findMany({
      where: { id_empresa: empresaId },
      include: {
        usuarios: {
          where: {
            OR: [
              {
                fecha_inicio: {
                  gte: fechaInicio,
                  lte: fechaFin,
                },
              },
              {
                fecha_fin: {
                  gte: fechaInicio,
                  lte: fechaFin,
                },
              },
              {
                AND: [
                  { fecha_fin: null },
                  {
                    fecha_inicio: {
                      lte: fechaFin,
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    });

    // Nuevas asignaciones en el período
    const nuevasAsignaciones = await this.prisma.usuarioRolEmpresa.count({
      where: {
        id_rol: {
          in: rolesEmpresa.map((r) => r.id_rol),
        },
        fecha_inicio: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
    });

    // Asignaciones finalizadas en el período
    const asignacionesFinalizadas = await this.prisma.usuarioRolEmpresa.count({
      where: {
        id_rol: {
          in: rolesEmpresa.map((r) => r.id_rol),
        },
        fecha_fin: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
    });

    // Usuarios con rol activo actualmente
    const usuariosConRolActivo = await this.prisma.usuarioRolEmpresa.count({
      where: {
        id_rol: {
          in: rolesEmpresa.map((r) => r.id_rol),
        },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
    });

    const rolesActivos = rolesEmpresa.filter(
      (rol) => rol.usuarios.length > 0,
    ).length;
    const rolesInactivos = rolesEmpresa.length - rolesActivos;

    // Distribución por rol
    const distribucionPorRol = rolesEmpresa.map((rol) => {
      const nuevasAsignacionesRol = rol.usuarios.filter(
        (ur) => ur.fecha_inicio >= fechaInicio && ur.fecha_inicio <= fechaFin,
      ).length;

      const asignacionesActivas = rol.usuarios.filter(
        (ur) => !ur.fecha_fin || ur.fecha_fin > new Date(),
      ).length;

      return {
        id_rol: rol.id_rol,
        nombre: rol.nombre,
        nuevasAsignaciones: nuevasAsignacionesRol,
        asignacionesActivas,
      };
    });

    return {
      rolesActivos,
      rolesInactivos,
      nuevasAsignaciones,
      asignacionesFinalizadas,
      usuariosConRolActivo,
      distribucionPorRol: distribucionPorRol.sort(
        (a, b) => b.nuevasAsignaciones - a.nuevasAsignaciones,
      ),
    };
  }

  // Análisis de eficiencia de roles por empresa
  async analyzeRoleEfficiencyByEmpresa(empresaId: number): Promise<{
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
    recomendaciones: string[];
  }> {
    const rolesEmpresa = await this.prisma.rolEmpresa.findMany({
      where: { id_empresa: empresaId },
      include: {
        usuarios: {
          where: {
            OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
          },
        },
        permisos: true,
      },
    });

    const rolesConDatos = rolesEmpresa.map((rol) => ({
      id_rol: rol.id_rol,
      nombre: rol.nombre,
      totalUsuarios: rol.usuarios.length,
      totalPermisos: rol.permisos.length,
      eficiencia:
        rol.permisos.length > 0 ? rol.usuarios.length / rol.permisos.length : 0,
      ratio:
        rol.usuarios.length > 0 ? rol.permisos.length / rol.usuarios.length : 0,
    }));

    // Roles subutilizados (muchos permisos, pocos usuarios)
    const rolesSubutilizados = rolesConDatos
      .filter((rol) => rol.totalPermisos > 3 && rol.eficiencia < 0.5)
      .sort((a, b) => a.eficiencia - b.eficiencia)
      .slice(0, 5);

    // Roles sobreasignados (muchos permisos por usuario)
    const rolesSobreasignados = rolesConDatos
      .filter((rol) => rol.totalUsuarios > 0 && rol.ratio > 8)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);

    // Generar recomendaciones específicas para contexto peruano
    const recomendaciones: string[] = [];

    if (rolesSubutilizados.length > 0) {
      recomendaciones.push(
        `Se detectaron ${rolesSubutilizados.length} roles subutilizados. Considere consolidar permisos o asignar más usuarios.`,
      );
    }

    if (rolesSobreasignados.length > 0) {
      recomendaciones.push(
        `Se detectaron ${rolesSobreasignados.length} roles con demasiados permisos por usuario. Considere dividir responsabilidades según la legislación laboral peruana.`,
      );
    }

    if (rolesEmpresa.length > 20) {
      recomendaciones.push(
        'La empresa tiene muchos roles. Considere simplificar la estructura organizacional siguiendo las mejores prácticas empresariales peruanas.',
      );
    }

    if (rolesEmpresa.filter((r) => r.usuarios.length === 0).length > 5) {
      recomendaciones.push(
        'Hay varios roles sin usuarios asignados. Considere eliminar roles innecesarios para optimizar la gestión.',
      );
    }

    return {
      rolesSubutilizados,
      rolesSobreasignados,
      recomendaciones,
    };
  }

  // Métricas de cumplimiento laboral peruano
  async calculateLaborComplianceMetrics(empresaId: number): Promise<{
    rolesConHorarioDefinido: number;
    rolesSinHorarioDefinido: number;
    usuariosConHorarioCompleto: number;
    usuariosConHorarioParcial: number;
    cumplimientoLeyLaboral: {
      rolesConMaximo8Horas: number;
      rolesExcedenLimite: number;
      porcentajeCumplimiento: number;
    };
    recomendacionesLegales: string[];
  }> {
    const rolesEmpresa = await this.prisma.rolEmpresa.findMany({
      where: { id_empresa: empresaId },
      include: {
        usuarios: {
          where: {
            OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
          },
        },
      },
    });

    const rolesConHorarioDefinido = rolesEmpresa.filter(
      (rol) => rol.horario_inicio && rol.horario_fin,
    ).length;
    const rolesSinHorarioDefinido =
      rolesEmpresa.length - rolesConHorarioDefinido;

    // Calcular horas de trabajo por rol
    const rolesConHoras = rolesEmpresa
      .filter((rol) => rol.horario_inicio && rol.horario_fin)
      .map((rol) => {
        const [horaInicio] = rol.horario_inicio!.split(':').map(Number);
        const [horaFin] = rol.horario_fin!.split(':').map(Number);
        let horasTrabajo = horaFin - horaInicio;
        if (horasTrabajo < 0) horasTrabajo += 24;
        return { ...rol, horasTrabajo };
      });

    const rolesConMaximo8Horas = rolesConHoras.filter(
      (rol) => rol.horasTrabajo <= 8,
    ).length;
    const rolesExcedenLimite = rolesConHoras.filter(
      (rol) => rol.horasTrabajo > 8,
    ).length;

    const porcentajeCumplimiento =
      rolesConHoras.length > 0
        ? Math.round((rolesConMaximo8Horas / rolesConHoras.length) * 100)
        : 100;

    // Contar usuarios por tipo de horario
    const usuariosConHorarioCompleto = rolesConHoras
      .filter((rol) => rol.horasTrabajo === 8)
      .reduce((sum, rol) => sum + rol.usuarios.length, 0);

    const usuariosConHorarioParcial = rolesConHoras
      .filter((rol) => rol.horasTrabajo < 8)
      .reduce((sum, rol) => sum + rol.usuarios.length, 0);

    // Generar recomendaciones legales específicas para Perú
    const recomendacionesLegales: string[] = [];

    if (rolesExcedenLimite > 0) {
      recomendacionesLegales.push(
        `${rolesExcedenLimite} roles exceden las 8 horas diarias permitidas por la ley laboral peruana. Ajuste los horarios para cumplir con la normativa.`,
      );
    }

    if (rolesSinHorarioDefinido > rolesConHorarioDefinido) {
      recomendacionesLegales.push(
        'La mayoría de roles no tienen horarios definidos. Defina horarios claros para cumplir con las obligaciones laborales.',
      );
    }

    if (porcentajeCumplimiento < 80) {
      recomendacionesLegales.push(
        'El cumplimiento de la jornada laboral está por debajo del 80%. Revise y ajuste los horarios según la legislación peruana.',
      );
    }

    return {
      rolesConHorarioDefinido,
      rolesSinHorarioDefinido,
      usuariosConHorarioCompleto,
      usuariosConHorarioParcial,
      cumplimientoLeyLaboral: {
        rolesConMaximo8Horas,
        rolesExcedenLimite,
        porcentajeCumplimiento,
      },
      recomendacionesLegales,
    };
  }
}
