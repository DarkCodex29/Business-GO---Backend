import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const permisosBasicos = [
  // Permisos de Usuario
  {
    nombre: 'crear_usuario',
    descripcion: 'Permite crear nuevos usuarios',
    recurso: 'usuario',
    accion: 'crear',
  },
  {
    nombre: 'leer_usuario',
    descripcion: 'Permite ver usuarios',
    recurso: 'usuario',
    accion: 'leer',
  },
  {
    nombre: 'actualizar_usuario',
    descripcion: 'Permite modificar usuarios',
    recurso: 'usuario',
    accion: 'actualizar',
  },
  {
    nombre: 'eliminar_usuario',
    descripcion: 'Permite eliminar usuarios',
    recurso: 'usuario',
    accion: 'eliminar',
  },

  // Permisos de Empresa
  {
    nombre: 'crear_empresa',
    descripcion: 'Permite crear nuevas empresas',
    recurso: 'empresa',
    accion: 'crear',
  },
  {
    nombre: 'leer_empresa',
    descripcion: 'Permite ver empresas',
    recurso: 'empresa',
    accion: 'leer',
  },
  {
    nombre: 'actualizar_empresa',
    descripcion: 'Permite modificar empresas',
    recurso: 'empresa',
    accion: 'actualizar',
  },
  {
    nombre: 'eliminar_empresa',
    descripcion: 'Permite eliminar empresas',
    recurso: 'empresa',
    accion: 'eliminar',
  },

  // Permisos de Cliente
  {
    nombre: 'crear_cliente',
    descripcion: 'Permite crear nuevos clientes',
    recurso: 'cliente',
    accion: 'crear',
  },
  {
    nombre: 'leer_cliente',
    descripcion: 'Permite ver clientes',
    recurso: 'cliente',
    accion: 'leer',
  },
  {
    nombre: 'actualizar_cliente',
    descripcion: 'Permite modificar clientes',
    recurso: 'cliente',
    accion: 'actualizar',
  },
  {
    nombre: 'eliminar_cliente',
    descripcion: 'Permite eliminar clientes',
    recurso: 'cliente',
    accion: 'eliminar',
  },

  // Permisos de Producto/Servicio
  {
    nombre: 'crear_producto',
    descripcion: 'Permite crear nuevos productos/servicios',
    recurso: 'producto',
    accion: 'crear',
  },
  {
    nombre: 'leer_producto',
    descripcion: 'Permite ver productos/servicios',
    recurso: 'producto',
    accion: 'leer',
  },
  {
    nombre: 'actualizar_producto',
    descripcion: 'Permite modificar productos/servicios',
    recurso: 'producto',
    accion: 'actualizar',
  },
  {
    nombre: 'eliminar_producto',
    descripcion: 'Permite eliminar productos/servicios',
    recurso: 'producto',
    accion: 'eliminar',
  },
];

const rolesBasicos = [
  {
    nombre: 'ADMIN',
    descripcion: 'Administrador del sistema con acceso total',
    permisos: [
      'crear_usuario',
      'leer_usuario',
      'actualizar_usuario',
      'eliminar_usuario',
      'crear_empresa',
      'leer_empresa',
      'actualizar_empresa',
      'eliminar_empresa',
      'crear_cliente',
      'leer_cliente',
      'actualizar_cliente',
      'eliminar_cliente',
      'crear_producto',
      'leer_producto',
      'actualizar_producto',
      'eliminar_producto',
    ],
  },
  {
    nombre: 'EMPRESA',
    descripcion: 'Usuario de tipo empresa',
    permisos: [
      'leer_usuario',
      'actualizar_usuario',
      'leer_empresa',
      'actualizar_empresa',
      'crear_cliente',
      'leer_cliente',
      'actualizar_cliente',
      'crear_producto',
      'leer_producto',
      'actualizar_producto',
      'eliminar_producto',
    ],
  },
  {
    nombre: 'CLIENTE',
    descripcion: 'Usuario de tipo cliente',
    permisos: [
      'leer_usuario',
      'actualizar_usuario',
      'leer_empresa',
      'leer_cliente',
      'actualizar_cliente',
      'leer_producto',
    ],
  },
];

export async function inicializarPermisos(prisma: PrismaService) {
  const logger = new Logger('InicializarPermisos');

  try {
    logger.log('Iniciando proceso de inicialización de permisos básicos...');

    // Obtener permisos existentes
    const permisosExistentes = await prisma.permiso.findMany({
      select: { nombre: true },
    });
    const nombresPermisosExistentes = new Set(
      permisosExistentes.map((p) => p.nombre),
    );

    // Crear o actualizar permisos
    for (const permiso of permisosBasicos) {
      try {
        await prisma.permiso.upsert({
          where: { nombre: permiso.nombre },
          update: {
            descripcion: permiso.descripcion,
            recurso: permiso.recurso,
            accion: permiso.accion,
          },
          create: permiso,
        });
        nombresPermisosExistentes.delete(permiso.nombre);
      } catch (error) {
        logger.error(`Error al procesar permiso ${permiso.nombre}:`, error);
        throw error;
      }
    }

    // Remover permisos obsoletos si es necesario
    if (nombresPermisosExistentes.size > 0) {
      logger.warn(
        `Removiendo permisos obsoletos: ${Array.from(nombresPermisosExistentes).join(', ')}`,
      );

      try {
        await prisma.permiso.deleteMany({
          where: {
            nombre: {
              in: Array.from(nombresPermisosExistentes),
            },
          },
        });
      } catch (error) {
        logger.error('Error al remover permisos obsoletos:', error);
        throw error;
      }
    }

    logger.log('Permisos básicos actualizados exitosamente');

    // Crear roles y asignar permisos
    for (const rol of rolesBasicos) {
      try {
        const { nombre, descripcion, permisos: permisosRol } = rol;

        // Crear o actualizar rol
        const rolCreado = await prisma.rol.upsert({
          where: { nombre },
          update: { descripcion },
          create: { nombre, descripcion },
        });

        // Obtener IDs de los permisos
        const permisosIds = await Promise.all(
          permisosRol.map(async (nombrePermiso) => {
            try {
              const permiso = await prisma.permiso.findUnique({
                where: { nombre: nombrePermiso },
              });
              if (!permiso) {
                logger.warn(`Permiso no encontrado: ${nombrePermiso}`);
                return null;
              }
              return permiso.id_permiso;
            } catch (error) {
              logger.error(`Error al buscar permiso ${nombrePermiso}:`, error);
              return null;
            }
          }),
        );

        // Remover permisos existentes del rol
        await prisma.permisoRol.deleteMany({
          where: { rol_id: rolCreado.id_rol },
        });

        // Asignar nuevos permisos al rol
        for (const permisoId of permisosIds) {
          if (permisoId) {
            try {
              await prisma.permisoRol.create({
                data: {
                  rol_id: rolCreado.id_rol,
                  permiso_id: permisoId,
                },
              });
            } catch (error) {
              logger.error(
                `Error al asignar permiso ${permisoId} al rol ${nombre}:`,
                error,
              );
              throw error;
            }
          }
        }

        logger.log(
          `Rol ${nombre} actualizado con ${permisosIds.filter(Boolean).length} permisos`,
        );
      } catch (error) {
        logger.error(`Error al procesar rol ${rol.nombre}:`, error);
        throw error;
      }
    }

    logger.log('Proceso de inicialización completado exitosamente');
  } catch (error) {
    logger.error('Error durante la inicialización de permisos:', error);
    throw error;
  }
}
