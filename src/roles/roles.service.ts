import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRolDto: CreateRolDto) {
    const rolExistente = await this.prisma.rol.findFirst({
      where: { nombre: createRolDto.nombre },
    });

    if (rolExistente) {
      throw new ConflictException('Ya existe un rol con este nombre');
    }

    // Si se especifica un rol padre, verificar que exista
    if (createRolDto.rol_padre_id) {
      const rolPadre = await this.prisma.rol.findUnique({
        where: { id_rol: createRolDto.rol_padre_id },
      });

      if (!rolPadre) {
        throw new NotFoundException(
          `Rol padre con ID ${createRolDto.rol_padre_id} no encontrado`,
        );
      }
    }

    return this.prisma.rol.create({
      data: createRolDto,
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
        rol: true, // rol padre
        other_Rol: true, // roles hijos
      },
    });
  }

  async findAll() {
    return this.prisma.rol.findMany({
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
        rol: true, // rol padre
        other_Rol: true, // roles hijos
      },
    });
  }

  async findOne(id: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: id },
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
        rol: true, // rol padre
        other_Rol: true, // roles hijos
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return rol;
  }

  async update(id: number, updateRolDto: UpdateRolDto) {
    const rolExistente = await this.prisma.rol.findUnique({
      where: { id_rol: id },
    });

    if (!rolExistente) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (updateRolDto.nombre) {
      const nombreExistente = await this.prisma.rol.findFirst({
        where: {
          nombre: updateRolDto.nombre,
          id_rol: { not: id },
        },
      });

      if (nombreExistente) {
        throw new ConflictException('Ya existe un rol con este nombre');
      }
    }

    // Si se actualiza el rol padre, verificar que exista y que no sea el mismo rol
    if (updateRolDto.rol_padre_id) {
      if (updateRolDto.rol_padre_id === id) {
        throw new ConflictException('Un rol no puede ser su propio padre');
      }

      const rolPadre = await this.prisma.rol.findUnique({
        where: { id_rol: updateRolDto.rol_padre_id },
      });

      if (!rolPadre) {
        throw new NotFoundException(
          `Rol padre con ID ${updateRolDto.rol_padre_id} no encontrado`,
        );
      }
    }

    return this.prisma.rol.update({
      where: { id_rol: id },
      data: updateRolDto,
      include: {
        permisoRol: {
          include: {
            permiso: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
        rol: true, // rol padre
        other_Rol: true, // roles hijos
      },
    });
  }

  async remove(id: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: id },
      include: {
        usuario: true,
        other_Rol: true, // roles hijos
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (rol.usuario.length > 0) {
      throw new ConflictException(
        'No se puede eliminar el rol porque tiene usuarios asociados',
      );
    }

    if (rol.other_Rol.length > 0) {
      throw new ConflictException(
        'No se puede eliminar el rol porque tiene roles hijos asociados',
      );
    }

    return this.prisma.rol.delete({
      where: { id_rol: id },
    });
  }

  // Métodos adicionales para manejar permisos
  async asignarPermiso(rolId: number, permisoId: number) {
    await this.findOne(rolId);
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: permisoId },
    });

    if (!permiso) {
      throw new NotFoundException(`Permiso con ID ${permisoId} no encontrado`);
    }

    return this.prisma.permisoRol.create({
      data: {
        rol_id: rolId,
        permiso_id: permisoId,
      },
      include: {
        permiso: true,
        rol: true,
      },
    });
  }

  async removerPermiso(rolId: number, permisoId: number) {
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
