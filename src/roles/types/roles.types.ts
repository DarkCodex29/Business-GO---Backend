export interface RolMetrics {
  totalRoles: number;
  rolesConUsuarios: number;
  rolesSinUsuarios: number;
  rolesConHijos: number;
  rolesSinHijos: number;
  promedioUsuariosPorRol: number;
  rolConMasUsuarios: {
    id_rol: number;
    nombre: string;
    totalUsuarios: number;
  } | null;
  distribucionJerarquia: {
    nivel: number;
    cantidad: number;
  }[];
}

export interface RolUsageStats {
  id_rol: number;
  nombre: string;
  descripcion: string;
  totalUsuarios: number;
  totalPermisos: number;
  esRolPadre: boolean;
  tieneRolPadre: boolean;
  nivelJerarquia: number;
  fechaCreacion?: Date;
  ultimoAccesoUsuarios?: Date;
}

export interface PermissionDistribution {
  id_permiso: number;
  nombre: string;
  descripcion: string;
  totalRolesAsignados: number;
  porcentajeCobertura: number;
  rolesAsignados: {
    id_rol: number;
    nombre: string;
  }[];
}
