export const rolesPredefinidos = {
  PELUQUERIA: [
    { nombre: 'barbero', descripcion: 'Barbero profesional' },
    { nombre: 'recepcionista', descripcion: 'Atención al cliente' },
    { nombre: 'administrador', descripcion: 'Gestión de la peluquería' },
  ],
  RESTAURANTE: [
    { nombre: 'chef', descripcion: 'Chef principal' },
    { nombre: 'mesero', descripcion: 'Atención a mesas' },
    { nombre: 'cajero', descripcion: 'Gestión de pagos' },
  ],
  RETAIL: [
    { nombre: 'vendedor', descripcion: 'Vendedor de tienda' },
    { nombre: 'almacenista', descripcion: 'Gestión de inventario' },
    { nombre: 'cajero', descripcion: 'Gestión de pagos' },
  ],
  SERVICIOS: [
    { nombre: 'técnico', descripcion: 'Técnico de servicios' },
    { nombre: 'supervisor', descripcion: 'Supervisor de servicios' },
    { nombre: 'administrador', descripcion: 'Gestión de servicios' },
  ],
  GENERAL: [
    { nombre: 'administrador', descripcion: 'Administrador de la empresa' },
    { nombre: 'gerente', descripcion: 'Gerente general' },
    { nombre: 'supervisor', descripcion: 'Supervisor general' },
    { nombre: 'empleado', descripcion: 'Empleado general' },
  ],
};

export const permisosPorRol = {
  barbero: [
    { recurso: 'cita', accion: 'crear' },
    { recurso: 'cita', accion: 'actualizar' },
    { recurso: 'servicio', accion: 'leer' },
    { recurso: 'cliente', accion: 'leer' },
  ],
  recepcionista: [
    { recurso: 'cita', accion: 'crear' },
    { recurso: 'cita', accion: 'leer' },
    { recurso: 'cliente', accion: 'crear' },
    { recurso: 'cliente', accion: 'leer' },
  ],
  administrador: [
    { recurso: 'cita', accion: 'crear' },
    { recurso: 'cita', accion: 'leer' },
    { recurso: 'cita', accion: 'actualizar' },
    { recurso: 'cita', accion: 'eliminar' },
    { recurso: 'cliente', accion: 'crear' },
    { recurso: 'cliente', accion: 'leer' },
    { recurso: 'cliente', accion: 'actualizar' },
    { recurso: 'cliente', accion: 'eliminar' },
    { recurso: 'servicio', accion: 'crear' },
    { recurso: 'servicio', accion: 'leer' },
    { recurso: 'servicio', accion: 'actualizar' },
    { recurso: 'servicio', accion: 'eliminar' },
  ],
  // Más roles y permisos...
};

export const LIMITE_ROLES_EMPRESA = 10;
