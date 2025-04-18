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
    try {
      return await this.prisma.rol.create({
        data: createRolDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('El nombre del rol ya existe');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.rol.findMany({
      include: {
        _count: {
          select: {
            usuario: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: id },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
            telefono: true,
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
    try {
      return await this.prisma.rol.update({
        where: { id_rol: id },
        data: updateRolDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('El nombre del rol ya existe');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.rol.delete({
        where: { id_rol: id },
      });
      return {
        message: `Rol con ID ${id} eliminado exitosamente`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }
      if (error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar el rol porque tiene usuarios asociados',
        );
      }
      throw error;
    }
  }
}
