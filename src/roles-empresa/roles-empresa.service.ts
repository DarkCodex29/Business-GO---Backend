import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRolEmpresaDto } from './dto/create-rol-empresa.dto';
import { UpdateRolEmpresaDto } from './dto/update-rol-empresa.dto';

@Injectable()
export class RolesEmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRolEmpresaDto: CreateRolEmpresaDto) {
    // Verificar si la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: createRolEmpresaDto.id_empresa },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return this.prisma.rolEmpresa.create({
      data: {
        nombre: createRolEmpresaDto.nombre,
        descripcion: createRolEmpresaDto.descripcion,
        id_empresa: createRolEmpresaDto.id_empresa,
        horario_inicio: createRolEmpresaDto.horario_inicio,
        horario_fin: createRolEmpresaDto.horario_fin,
        fecha_inicio: createRolEmpresaDto.fecha_inicio,
        fecha_fin: createRolEmpresaDto.fecha_fin,
      },
    });
  }

  async findAll() {
    return this.prisma.rolEmpresa.findMany({
      include: {
        empresa: true,
        permisos: true,
      },
    });
  }

  async findOne(id: number) {
    const rolEmpresa = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: id },
      include: {
        empresa: true,
        permisos: true,
        usuarios: true,
      },
    });

    if (!rolEmpresa) {
      throw new NotFoundException('Rol de empresa no encontrado');
    }

    return rolEmpresa;
  }

  async update(id: number, updateRolEmpresaDto: UpdateRolEmpresaDto) {
    // Verificar si el rol existe
    const rolEmpresa = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: id },
    });

    if (!rolEmpresa) {
      throw new NotFoundException('Rol de empresa no encontrado');
    }

    // Si se está actualizando la empresa, verificar si existe
    if (updateRolEmpresaDto.id_empresa) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id_empresa: updateRolEmpresaDto.id_empresa },
      });

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }
    }

    return this.prisma.rolEmpresa.update({
      where: { id_rol: id },
      data: updateRolEmpresaDto,
    });
  }

  async remove(id: number) {
    // Verificar si el rol existe
    const rolEmpresa = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: id },
    });

    if (!rolEmpresa) {
      throw new NotFoundException('Rol de empresa no encontrado');
    }

    // Verificar si hay usuarios asignados a este rol
    const usuariosAsignados = await this.prisma.usuarioRolEmpresa.findMany({
      where: { id_rol: id },
    });

    if (usuariosAsignados.length > 0) {
      throw new Error(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    return this.prisma.rolEmpresa.delete({
      where: { id_rol: id },
    });
  }

  async asignarPermiso(idRol: number, idPermiso: number) {
    // Verificar si el rol existe
    const rolEmpresa = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: idRol },
    });

    if (!rolEmpresa) {
      throw new NotFoundException('Rol de empresa no encontrado');
    }

    // Verificar si el permiso existe
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso: idPermiso },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return this.prisma.permisoRolEmpresa.create({
      data: {
        id_rol: idRol,
        permiso_id: idPermiso,
        recurso: permiso.recurso,
        accion: permiso.accion,
      },
    });
  }

  async removerPermiso(idRol: number, idPermiso: number) {
    return this.prisma.permisoRolEmpresa.deleteMany({
      where: {
        id_rol: idRol,
        permiso_id: idPermiso,
      },
    });
  }
}
