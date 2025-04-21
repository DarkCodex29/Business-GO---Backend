export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CLIENTE: 'CLIENTE',
  PROVEEDOR: 'PROVEEDOR',
  API: 'API',
} as const;

export const ROLES_EMPRESA = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  GERENTE: 'GERENTE',
  SUPERVISOR: 'SUPERVISOR',
  VENDEDOR: 'VENDEDOR',
  ALMACEN: 'ALMACEN',
  CONTADOR: 'CONTADOR',
  RECURSOS_HUMANOS: 'RECURSOS_HUMANOS',
  AUDITOR: 'AUDITOR',
  MARKETING: 'MARKETING',
  SOPORTE: 'SOPORTE',
  ANALISTA_DATOS: 'ANALISTA_DATOS',
  GESTOR_LEGAL: 'GESTOR_LEGAL',
  GESTOR_CALIDAD: 'GESTOR_CALIDAD',
} as const;

// Tipo que combina todos los roles posibles
export type RoleType =
  | (typeof ROLES)[keyof typeof ROLES]
  | (typeof ROLES_EMPRESA)[keyof typeof ROLES_EMPRESA];

// Roles que tienen acceso administrativo
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN] as const;
