import { Injectable } from '@nestjs/common';

@Injectable()
export class RolesPredefinidosConfig {
  // Roles Globales del Sistema
  static readonly ROLES_GLOBALES = {
    SUPER_ADMIN: {
      nombre: 'SUPER_ADMIN',
      descripcion: 'Administrador del sistema con acceso total',
    },
    ADMIN: {
      nombre: 'ADMIN',
      descripcion: 'Administrador con acceso completo a una empresa',
    },
    USUARIO: {
      nombre: 'USUARIO',
      descripcion: 'Usuario básico del sistema',
    },
    CLIENTE: {
      nombre: 'CLIENTE',
      descripcion: 'Usuario tipo cliente',
    },
  };

  // Roles por Empresa
  static readonly ROLES_EMPRESA = {
    ADMINISTRADOR: {
      nombre: 'ADMINISTRADOR',
      descripcion: 'Administrador de la empresa',
      permisos: [
        'empresa.ver',
        'empresa.editar',
        'usuarios.ver',
        'usuarios.crear',
        'usuarios.editar',
        'usuarios.eliminar',
        'roles.ver',
        'roles.crear',
        'roles.editar',
        'roles.eliminar',
      ],
    },
    GERENTE: {
      nombre: 'GERENTE',
      descripcion: 'Gerente de la empresa',
      permisos: [
        'empresa.ver',
        'reportes.ver',
        'ventas.ver',
        'ventas.crear',
        'ventas.editar',
        'productos.ver',
        'productos.crear',
        'productos.editar',
        'clientes.ver',
        'clientes.crear',
        'clientes.editar',
      ],
    },
    VENDEDOR: {
      nombre: 'VENDEDOR',
      descripcion: 'Vendedor de la empresa',
      permisos: [
        'ventas.ver',
        'ventas.crear',
        'productos.ver',
        'clientes.ver',
        'clientes.crear',
      ],
    },
    INVENTARIO: {
      nombre: 'INVENTARIO',
      descripcion: 'Gestor de inventario',
      permisos: [
        'productos.ver',
        'productos.crear',
        'productos.editar',
        'inventario.ver',
        'inventario.crear',
        'inventario.editar',
      ],
    },
    CONTADOR: {
      nombre: 'CONTADOR',
      descripcion: 'Contador de la empresa',
      permisos: [
        'contabilidad.ver',
        'contabilidad.crear',
        'contabilidad.editar',
        'reportes.ver',
        'ventas.ver',
        'compras.ver',
      ],
    },
  };

  // Permisos por Módulo
  static readonly PERMISOS_MODULO = {
    EMPRESA: ['ver', 'crear', 'editar', 'eliminar'],
    USUARIOS: ['ver', 'crear', 'editar', 'eliminar'],
    ROLES: ['ver', 'crear', 'editar', 'eliminar'],
    PRODUCTOS: ['ver', 'crear', 'editar', 'eliminar'],
    VENTAS: ['ver', 'crear', 'editar', 'eliminar', 'anular'],
    COMPRAS: ['ver', 'crear', 'editar', 'eliminar', 'anular'],
    CLIENTES: ['ver', 'crear', 'editar', 'eliminar'],
    PROVEEDORES: ['ver', 'crear', 'editar', 'eliminar'],
    INVENTARIO: ['ver', 'crear', 'editar', 'eliminar'],
    CONTABILIDAD: ['ver', 'crear', 'editar', 'eliminar'],
    REPORTES: ['ver', 'crear', 'editar', 'eliminar'],
  };
}
