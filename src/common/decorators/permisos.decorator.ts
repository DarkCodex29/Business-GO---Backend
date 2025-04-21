import { SetMetadata } from '@nestjs/common';

export const PERMISOS_KEY = 'permisos';

export interface PermisoRequerido {
  recurso: string;
  accion: string;
}

export const RequierePermiso = (permiso: PermisoRequerido) =>
  SetMetadata(PERMISOS_KEY, permiso);
