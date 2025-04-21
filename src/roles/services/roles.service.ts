import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRolDto } from '../dto/create-rol.dto';
import { UpdateRolDto } from '../dto/update-rol.dto';
import { AsignarPermisosDto } from '../dto/asignar-permisos.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRolDto: CreateRolDto) {
    const rolExistente = await this.prisma.rol.findFirst({
      where: {
        nombre: createRolDto.nombre,
      },
    });

    if (rolExistente) {
      throw new ConflictException('Ya existe un rol con este nombre');
    }

    // Si se especifica un rol padre, verificar que exista
    if (createRolDto.rol_padre_id) {
      const rolPadre = await this.prisma.rol.findUnique({
        where: {
          id_rol: createRolDto.rol_padre_id,
        },
      });

      if (!rolPadre) {
        throw new NotFoundException(
          `Rol padre con ID ${createRolDto.rol_padre_id} no encontrado`,
        );
      }
    }

    const rol = await this.prisma.rol.create({
      data: {
        nombre: createRolDto.nombre,
        descripcion: createRolDto.descripcion,
        rol_padre_id: createRolDto.rol_padre_id,
      },
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });

    return rol;
  }

  async findAll() {
    return this.prisma.rol.findMany({
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const rol = await this.prisma.rol.findUnique({
      where: {
        id_rol: id,
      },
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return rol;
  }

  async update(id: number, updateRolDto: UpdateRolDto) {
    const rol = await this.prisma.rol.findUnique({
      where: {
        id_rol: id,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return this.prisma.rol.update({
      where: {
        id_rol: id,
      },
      data: {
        nombre: updateRolDto.nombre,
        descripcion: updateRolDto.descripcion,
        rol_padre_id: updateRolDto.rol_padre_id,
      },
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const rol = await this.prisma.rol.findUnique({
      where: {
        id_rol: id,
      },
      include: {
        usuario: true,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (rol.usuario.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    return this.prisma.rol.delete({
      where: {
        id_rol: id,
      },
    });
  }

  async asignarPermisos(id: number, asignarPermisosDto: AsignarPermisosDto) {
    const rol = await this.prisma.rol.findUnique({
      where: {
        id_rol: id,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    // Primero eliminamos los permisos existentes
    await this.prisma.permisoRol.deleteMany({
      where: {
        rol_id: id,
      },
    });

    // Luego creamos las nuevas relaciones
    await Promise.all(
      asignarPermisosDto.permisoIds.map(async (permisoId) => {
        const permiso = await this.prisma.permiso.findUnique({
          where: { id_permiso: permisoId },
        });

        if (!permiso) {
          throw new NotFoundException(
            `Permiso con ID ${permisoId} no encontrado`,
          );
        }

        return this.prisma.permisoRol.create({
          data: {
            rol_id: id,
            permiso_id: permisoId,
          },
        });
      }),
    );

    return this.prisma.rol.findUnique({
      where: {
        id_rol: id,
      },
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async removerPermiso(rolId: number, permisoId: number) {
    await this.findOne(rolId);

    const permisoRol = await this.prisma.permisoRol.findFirst({
      where: {
        rol_id: rolId,
        permiso_id: permisoId,
      },
    });

    if (!permisoRol) {
      throw new NotFoundException(
        `Permiso no encontrado para el rol especificado`,
      );
    }

    return this.prisma.permisoRol.delete({
      where: {
        id_permiso_rol: permisoRol.id_permiso_rol,
      },
    });
  }
}
