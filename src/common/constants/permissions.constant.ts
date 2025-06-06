// Permisos por Módulo
export const PERMISSIONS = {
  // Permisos de Sistema
  SISTEMA: {
    READ: 'sistema:read',
    WRITE: 'sistema:write',
    ADMIN: 'sistema:admin',
  },

  // Permisos de Empresas
  EMPRESA: {
    READ: 'empresa:read',
    WRITE: 'empresa:write',
    DELETE: 'empresa:delete',
    CONFIGURE: 'empresa:configure',
    CONFIGURACION: {
      IMPUESTOS: {
        READ: 'empresa:configuracion:impuestos:read',
        WRITE: 'empresa:configuracion:impuestos:write',
        DELETE: 'empresa:configuracion:impuestos:delete',
      },
      REGIONAL: {
        READ: 'empresa:configuracion:regional:read',
        WRITE: 'empresa:configuracion:regional:write',
        DELETE: 'empresa:configuracion:regional:delete',
      },
      MONEDA: {
        READ: 'empresa:configuracion:moneda:read',
        WRITE: 'empresa:configuracion:moneda:write',
        DELETE: 'empresa:configuracion:moneda:delete',
      },
    },
    USUARIOS: {
      READ: 'empresa:usuarios:read',
      WRITE: 'empresa:usuarios:write',
      DELETE: 'empresa:usuarios:delete',
      ASSIGN: 'empresa:usuarios:assign',
    },
    DIRECCIONES: {
      READ: 'empresa:direcciones:read',
      WRITE: 'empresa:direcciones:write',
      DELETE: 'empresa:direcciones:delete',
    },
  },

  // Permisos de Usuarios
  USUARIOS: {
    READ: 'usuarios:read',
    WRITE: 'usuarios:write',
    DELETE: 'usuarios:delete',
    BLOCK: 'usuarios:block',
  },

  // Permisos de Roles
  ROLES: {
    READ: 'roles:read',
    WRITE: 'roles:write',
    DELETE: 'roles:delete',
    ASSIGN: 'roles:assign',
    MANAGE: 'roles:manage',
  },

  // Permisos de Productos
  PRODUCTOS: {
    READ: 'productos:read',
    WRITE: 'productos:write',
    DELETE: 'productos:delete',
    PUBLISH: 'productos:publish',
  },

  // Permisos de Servicios
  SERVICIOS: {
    READ: 'servicios:read',
    WRITE: 'servicios:write',
    DELETE: 'servicios:delete',
    PUBLISH: 'servicios:publish',
  },

  // Permisos de Ventas
  VENTAS: {
    READ: 'ventas:read',
    WRITE: 'ventas:write',
    DELETE: 'ventas:delete',
    CANCEL: 'ventas:cancel',
    REFUND: 'ventas:refund',
    COTIZACIONES: {
      READ: 'ventas:cotizaciones:read',
      CREATE: 'ventas:cotizaciones:create',
      UPDATE: 'ventas:cotizaciones:update',
      DELETE: 'ventas:cotizaciones:delete',
      PRINT: 'ventas:cotizaciones:print',
    },
    ORDENES: {
      READ: 'ventas:ordenes:read',
      CREATE: 'ventas:ordenes:create',
      UPDATE: 'ventas:ordenes:update',
      DELETE: 'ventas:ordenes:delete',
      APPROVE: 'ventas:ordenes:approve',
      CANCEL: 'ventas:ordenes:cancel',
      PRINT: 'ventas:ordenes:print',
    },
    FACTURAS: {
      READ: 'ventas:facturas:read',
      CREATE: 'ventas:facturas:create',
      UPDATE: 'ventas:facturas:update',
      DELETE: 'ventas:facturas:delete',
      PRINT: 'ventas:facturas:print',
    },
    NOTAS_CREDITO: {
      READ: 'ventas:notas_credito:read',
      CREATE: 'ventas:notas_credito:create',
      UPDATE: 'ventas:notas_credito:update',
      DELETE: 'ventas:notas_credito:delete',
      PRINT: 'ventas:notas_credito:print',
    },
    NOTAS_DEBITO: {
      READ: 'ventas:notas_debito:read',
      CREATE: 'ventas:notas_debito:create',
      UPDATE: 'ventas:notas_debito:update',
      DELETE: 'ventas:notas_debito:delete',
      PRINT: 'ventas:notas_debito:print',
    },
    PAGOS: {
      READ: 'ventas:pagos:read',
      CREATE: 'ventas:pagos:create',
      UPDATE: 'ventas:pagos:update',
      DELETE: 'ventas:pagos:delete',
      PROCESS: 'ventas:pagos:process',
    },
    REEMBOLSOS: {
      READ: 'ventas:reembolsos:read',
      CREATE: 'ventas:reembolsos:create',
      UPDATE: 'ventas:reembolsos:update',
      DELETE: 'ventas:reembolsos:delete',
      APPROVE: 'ventas:reembolsos:approve',
    },
  },

  // Permisos de Inventario
  INVENTARIO: {
    READ: 'inventario:read',
    WRITE: 'inventario:write',
    DELETE: 'inventario:delete',
    ADJUST: 'inventario:adjust',
  },

  // Permisos de Contabilidad
  CONTABILIDAD: {
    READ: 'contabilidad:read',
    WRITE: 'contabilidad:write',
    DELETE: 'contabilidad:delete',
    CLOSE: 'contabilidad:close',
  },

  // Permisos de Reportes
  REPORTES: {
    READ: 'reportes:read',
    WRITE: 'reportes:write',
    DELETE: 'reportes:delete',
    EXPORT: 'reportes:export',
    VENTAS: {
      READ: 'reportes:ventas:read',
      EXPORT: 'reportes:ventas:export',
    },
    COMPRAS: {
      READ: 'reportes:compras:read',
      EXPORT: 'reportes:compras:export',
    },
    INVENTARIO: {
      READ: 'reportes:inventario:read',
      EXPORT: 'reportes:inventario:export',
    },
    PRODUCTOS: {
      READ: 'reportes:productos:read',
      EXPORT: 'reportes:productos:export',
    },
    CLIENTES: {
      READ: 'reportes:clientes:read',
      EXPORT: 'reportes:clientes:export',
    },
    FINANCIERO: {
      READ: 'reportes:financiero:read',
      EXPORT: 'reportes:financiero:export',
    },
  },

  // Permisos de Configuración
  CONFIGURACION: {
    READ: 'configuracion:read',
    WRITE: 'configuracion:write',
    DELETE: 'configuracion:delete',
  },

  // Permisos de Documentos
  DOCUMENTOS: {
    READ: 'documentos:read',
    WRITE: 'documentos:write',
    DELETE: 'documentos:delete',
    UPLOAD: 'documentos:upload',
    DOWNLOAD: 'documentos:download',
  },

  // Permisos de Clientes
  CLIENTES: {
    READ: 'clientes:read',
    WRITE: 'clientes:write',
    DELETE: 'clientes:delete',
    VIEW: 'clientes:ver',
    CREATE: 'clientes:crear',
    EDIT: 'clientes:editar',
  },

  // Permisos de Compras
  COMPRAS: {
    READ: 'compras:read',
    WRITE: 'compras:write',
    DELETE: 'compras:delete',
    APPROVE: 'compras:approve',
    CANCEL: 'compras:cancel',
    PAY: 'compras:pay',
    ORDENES: {
      READ: 'compras:ordenes:read',
      CREATE: 'compras:ordenes:create',
      UPDATE: 'compras:ordenes:update',
      DELETE: 'compras:ordenes:delete',
      APPROVE: 'compras:ordenes:approve',
      CANCEL: 'compras:ordenes:cancel',
      PAY: 'compras:ordenes:pay',
      RECEIVE: 'compras:ordenes:receive',
      PRINT: 'compras:ordenes:print',
    },
  },

  // Permisos de Proveedores
  PROVEEDORES: {
    READ: 'proveedores:read',
    WRITE: 'proveedores:write',
    DELETE: 'proveedores:delete',
    ASSIGN: 'proveedores:assign',
    CONTACTO: {
      READ: 'proveedores:contacto:read',
      CREATE: 'proveedores:contacto:create',
      UPDATE: 'proveedores:contacto:update',
      DELETE: 'proveedores:contacto:delete',
    },
    DOCUMENTOS: {
      READ: 'proveedores:documentos:read',
      UPLOAD: 'proveedores:documentos:upload',
      DELETE: 'proveedores:documentos:delete',
    },
    EVALUACION: {
      READ: 'proveedores:evaluacion:read',
      CREATE: 'proveedores:evaluacion:create',
      UPDATE: 'proveedores:evaluacion:update',
    },
  },

  // Permisos de API
  API: {
    READ: 'api:read',
    WRITE: 'api:write',
  },

  // Permisos de Fidelización
  FIDELIZACION: {
    READ: 'fidelizacion:read',
    WRITE: 'fidelizacion:write',
    DELETE: 'fidelizacion:delete',
    PUNTOS: {
      READ: 'fidelizacion:puntos:read',
      WRITE: 'fidelizacion:puntos:write',
      ADJUST: 'fidelizacion:puntos:adjust',
    },
    CLIENTES: {
      READ: 'fidelizacion:clientes:read',
      WRITE: 'fidelizacion:clientes:write',
      DELETE: 'fidelizacion:clientes:delete',
    },
    REGLAS: {
      READ: 'fidelizacion:reglas:read',
      WRITE: 'fidelizacion:reglas:write',
      DELETE: 'fidelizacion:reglas:delete',
    },
  },

  // Permisos de Notificaciones
  NOTIFICACIONES: {
    READ: 'notificaciones:read',
    WRITE: 'notificaciones:write',
    DELETE: 'notificaciones:delete',
    SEND: 'notificaciones:send',
    BULK: 'notificaciones:bulk',
    FEEDBACK: {
      READ: 'notificaciones:feedback:read',
      WRITE: 'notificaciones:feedback:write',
    },
  },

  // Permisos de Valoraciones
  VALORACIONES: {
    READ: 'valoraciones:read',
    WRITE: 'valoraciones:write',
    DELETE: 'valoraciones:delete',
    CREATE: 'valoraciones:crear',
    EDIT: 'valoraciones:editar',
    VIEW: 'valoraciones:ver',
    MODERAR: 'valoraciones:moderar',
  },
} as const;

// Tipo que combina todos los permisos posibles
export type PermissionType =
  | (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]]
  | (typeof PERMISSIONS.COMPRAS.ORDENES)[keyof typeof PERMISSIONS.COMPRAS.ORDENES]
  | (typeof PERMISSIONS.PROVEEDORES.CONTACTO)[keyof typeof PERMISSIONS.PROVEEDORES.CONTACTO]
  | (typeof PERMISSIONS.PROVEEDORES.DOCUMENTOS)[keyof typeof PERMISSIONS.PROVEEDORES.DOCUMENTOS]
  | (typeof PERMISSIONS.PROVEEDORES.EVALUACION)[keyof typeof PERMISSIONS.PROVEEDORES.EVALUACION]
  | (typeof PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS)[keyof typeof PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS]
  | (typeof PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL)[keyof typeof PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL]
  | (typeof PERMISSIONS.EMPRESA.CONFIGURACION.MONEDA)[keyof typeof PERMISSIONS.EMPRESA.CONFIGURACION.MONEDA]
  | (typeof PERMISSIONS.EMPRESA.USUARIOS)[keyof typeof PERMISSIONS.EMPRESA.USUARIOS]
  | (typeof PERMISSIONS.EMPRESA.DIRECCIONES)[keyof typeof PERMISSIONS.EMPRESA.DIRECCIONES]
  | (typeof PERMISSIONS.FIDELIZACION.PUNTOS)[keyof typeof PERMISSIONS.FIDELIZACION.PUNTOS]
  | (typeof PERMISSIONS.FIDELIZACION.CLIENTES)[keyof typeof PERMISSIONS.FIDELIZACION.CLIENTES]
  | (typeof PERMISSIONS.FIDELIZACION.REGLAS)[keyof typeof PERMISSIONS.FIDELIZACION.REGLAS]
  | (typeof PERMISSIONS.NOTIFICACIONES.FEEDBACK)[keyof typeof PERMISSIONS.NOTIFICACIONES.FEEDBACK]
  | typeof PERMISSIONS.NOTIFICACIONES.READ
  | typeof PERMISSIONS.NOTIFICACIONES.WRITE
  | typeof PERMISSIONS.NOTIFICACIONES.DELETE
  | (typeof PERMISSIONS.REPORTES.VENTAS)[keyof typeof PERMISSIONS.REPORTES.VENTAS]
  | (typeof PERMISSIONS.REPORTES.COMPRAS)[keyof typeof PERMISSIONS.REPORTES.COMPRAS]
  | (typeof PERMISSIONS.REPORTES.INVENTARIO)[keyof typeof PERMISSIONS.REPORTES.INVENTARIO]
  | (typeof PERMISSIONS.REPORTES.PRODUCTOS)[keyof typeof PERMISSIONS.REPORTES.PRODUCTOS]
  | (typeof PERMISSIONS.REPORTES.CLIENTES)[keyof typeof PERMISSIONS.REPORTES.CLIENTES]
  | (typeof PERMISSIONS.REPORTES.FINANCIERO)[keyof typeof PERMISSIONS.REPORTES.FINANCIERO]
  | (typeof PERMISSIONS.VALORACIONES)[keyof typeof PERMISSIONS.VALORACIONES]
  | (typeof PERMISSIONS.VENTAS.COTIZACIONES)[keyof typeof PERMISSIONS.VENTAS.COTIZACIONES]
  | (typeof PERMISSIONS.VENTAS.ORDENES)[keyof typeof PERMISSIONS.VENTAS.ORDENES]
  | (typeof PERMISSIONS.VENTAS.FACTURAS)[keyof typeof PERMISSIONS.VENTAS.FACTURAS]
  | (typeof PERMISSIONS.VENTAS.NOTAS_CREDITO)[keyof typeof PERMISSIONS.VENTAS.NOTAS_CREDITO]
  | (typeof PERMISSIONS.VENTAS.NOTAS_DEBITO)[keyof typeof PERMISSIONS.VENTAS.NOTAS_DEBITO]
  | (typeof PERMISSIONS.VENTAS.PAGOS)[keyof typeof PERMISSIONS.VENTAS.PAGOS]
  | (typeof PERMISSIONS.VENTAS.REEMBOLSOS)[keyof typeof PERMISSIONS.VENTAS.REEMBOLSOS]
  | typeof PERMISSIONS.NOTIFICACIONES.SEND
  | typeof PERMISSIONS.NOTIFICACIONES.BULK
  | typeof PERMISSIONS.CLIENTES.DELETE
  | typeof PERMISSIONS.EMPRESA.DELETE
  | typeof PERMISSIONS.EMPRESA.CONFIGURE
  | typeof PERMISSIONS.PRODUCTOS.READ
  | typeof PERMISSIONS.PRODUCTOS.WRITE
  | typeof PERMISSIONS.PRODUCTOS.DELETE
  | typeof PERMISSIONS.PRODUCTOS.PUBLISH
  | typeof PERMISSIONS.ROLES.READ
  | typeof PERMISSIONS.ROLES.WRITE
  | typeof PERMISSIONS.ROLES.DELETE
  | typeof PERMISSIONS.ROLES.ASSIGN
  | typeof PERMISSIONS.ROLES.MANAGE
  | typeof PERMISSIONS.USUARIOS.READ
  | typeof PERMISSIONS.USUARIOS.WRITE
  | typeof PERMISSIONS.USUARIOS.DELETE
  | typeof PERMISSIONS.USUARIOS.BLOCK;

// Permisos que requieren acceso administrativo
export const ADMIN_PERMISSIONS = [
  PERMISSIONS.SISTEMA.ADMIN,
  PERMISSIONS.EMPRESA.CONFIGURE,
  PERMISSIONS.ROLES.ASSIGN,
  PERMISSIONS.ROLES.MANAGE,
] as const;
