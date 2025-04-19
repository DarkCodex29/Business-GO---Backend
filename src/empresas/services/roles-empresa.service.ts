import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';
import { AsignarPermisoRolEmpresaDto } from '../dto/asignar-permiso-rol-empresa.dto';
import { AsignarRolDto } from '../dto/asignar-rol.dto';

@Injectable()
export class RolesEmpresaService {
  private readonly logger = new Logger(RolesEmpresaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async crearRolEmpresa(createRolDto: CreateEmpresaRolDto) {
    const { permisos, ...rolData } = createRolDto;

    return this.prisma.rolEmpresa.create({
      data: {
        ...rolData,
        permisos: {
          create:
            permisos?.map((id) => ({
              permiso_id: id,
              recurso: 'empresa', // Valor por defecto
              accion: 'gestionar', // Valor por defecto
            })) || [],
        },
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async findAll(id_empresa: number) {
    return this.prisma.rolEmpresa.findMany({
      where: { id_empresa },
      include: {
        permisos: true,
      },
    });
  }

  async obtenerRol(id_empresa: number, id: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
      include: {
        permisos: true,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return rol;
  }

  async actualizarRol(
    id_empresa: number,
    id: number,
    updateRolDto: UpdateEmpresaRolDto,
  ) {
    const { permisos, ...rolData } = updateRolDto;

    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return this.prisma.rolEmpresa.update({
      where: { id_rol: id },
      data: {
        ...rolData,
        permisos: permisos
          ? {
              deleteMany: {},
              create: permisos.map((id) => ({
                permiso_id: id,
                recurso: 'empresa', // Valor por defecto
                accion: 'gestionar', // Valor por defecto
              })),
            }
          : undefined,
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async eliminarRol(id_empresa: number, id: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return this.prisma.rolEmpresa.delete({
      where: { id_rol: id },
    });
  }

  async asignarPermiso(
    id_empresa: number,
    asignarPermisoDto: AsignarPermisoRolEmpresaDto,
  ) {
    const { rol_id, permiso_id } = asignarPermisoDto;

    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: rol_id,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${rol_id} no encontrado`);
    }

    return this.prisma.rolEmpresa.update({
      where: { id_rol: rol_id },
      data: {
        permisos: {
          create: {
            permiso_id,
            recurso: 'empresa', // Valor por defecto
            accion: 'gestionar', // Valor por defecto
          },
        },
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });
  }

  async eliminarPermiso(
    id_empresa: number,
    id_rol: number,
    id_permiso: number,
  ) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id_rol} no encontrado`);
    }

    const permisoRol = await this.prisma.permisoRolEmpresa.findFirst({
      where: {
        id_rol,
        permiso_id: id_permiso,
      },
    });

    if (!permisoRol) {
      throw new NotFoundException(
        `Permiso con ID ${id_permiso} no encontrado para el rol ${id_rol}`,
      );
    }

    return this.prisma.permisoRolEmpresa.delete({
      where: { id_permiso_rol: permisoRol.id_permiso_rol },
    });
  }

  async verificarPermiso(
    id_usuario: number,
    id_empresa: number,
    recurso: string,
    accion: string,
  ) {
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: id_usuario,
        empresa_id: id_empresa,
      },
      include: {
        rol_empresa: {
          include: {
            permisos: true,
          },
        },
      },
    });

    if (!usuarioEmpresa || !usuarioEmpresa.rol_empresa) {
      return false;
    }

    return usuarioEmpresa.rol_empresa.permisos.some(
      (permiso) => permiso.recurso === recurso && permiso.accion === accion,
    );
  }

  async inicializarRolesPredefinidos(id_empresa: number) {
    const rolesPredefinidos = [
      {
        nombre: 'Administrador',
        descripcion: 'Rol con todos los permisos',
        id_empresa,
      },
      {
        nombre: 'Usuario',
        descripcion: 'Rol básico con permisos limitados',
        id_empresa,
      },
    ];

    return Promise.all(
      rolesPredefinidos.map((rol) =>
        this.prisma.rolEmpresa.create({ data: rol }),
      ),
    );
  }

  async asignarRol(asignarRolDto: AsignarRolDto) {
    const { id_usuario, id_empresa, id_rol } = asignarRolDto;

    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: id_usuario,
        empresa_id: id_empresa,
      },
    });

    if (usuarioEmpresa) {
      return this.prisma.usuarioEmpresa.update({
        where: {
          id_usuario_empresa: usuarioEmpresa.id_usuario_empresa,
        },
        data: {
          rol_empresa_id: id_rol,
        },
      });
    }

    return this.prisma.usuarioEmpresa.create({
      data: {
        usuario_id: id_usuario,
        empresa_id: id_empresa,
        rol_empresa_id: id_rol,
      },
    });
  }
}
