import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
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
    // Verificar unicidad de nombre en la empresa
    const rolExistente = await this.prisma.rolEmpresa.findFirst({
      where: {
        nombre: createRolDto.nombre,
        id_empresa: createRolDto.id_empresa,
      },
    });

    if (rolExistente) {
      throw new ConflictException(
        `Ya existe un rol con el nombre "${createRolDto.nombre}" en esta empresa`,
      );
    }

    const { permisos, ...rolData } = createRolDto;

    // Validar horarios si se proporcionan
    if (rolData.horario_inicio && rolData.horario_fin) {
      if (rolData.horario_inicio >= rolData.horario_fin) {
        throw new ConflictException(
          'La hora de inicio debe ser menor que la hora de fin',
        );
      }
    }

    // Validar fechas si se proporcionan
    if (rolData.fecha_inicio && rolData.fecha_fin) {
      if (rolData.fecha_inicio >= rolData.fecha_fin) {
        throw new ConflictException(
          'La fecha de inicio debe ser menor que la fecha de fin',
        );
      }
    }

    return this.prisma.rolEmpresa.create({
      data: {
        ...rolData,
        permisos: {
          create:
            permisos?.map((id) => ({
              permiso_id: id,
              recurso: 'empresa',
              accion: 'gestionar',
            })) || [],
        },
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
      },
    });
  }

  async findAll(id_empresa: number) {
    return this.prisma.rolEmpresa.findMany({
      where: {
        id_empresa,
        // Filtrar roles activos basados en fechas
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
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
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: true,
        usuarios_empresa: true,
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

    // Verificar unicidad de nombre si se está actualizando
    if (rolData.nombre) {
      const rolExistente = await this.prisma.rolEmpresa.findFirst({
        where: {
          nombre: rolData.nombre,
          id_empresa,
          id_rol: { not: id },
        },
      });

      if (rolExistente) {
        throw new ConflictException(
          `Ya existe un rol con el nombre "${rolData.nombre}" en esta empresa`,
        );
      }
    }

    // Validar horarios si se actualizan
    if (rolData.horario_inicio && rolData.horario_fin) {
      if (rolData.horario_inicio >= rolData.horario_fin) {
        throw new ConflictException(
          'La hora de inicio debe ser menor que la hora de fin',
        );
      }
    }

    // Validar fechas si se actualizan
    if (rolData.fecha_inicio && rolData.fecha_fin) {
      if (rolData.fecha_inicio >= rolData.fecha_fin) {
        throw new ConflictException(
          'La fecha de inicio debe ser menor que la fecha de fin',
        );
      }
    }

    return this.prisma.rolEmpresa.update({
      where: { id_rol: id },
      data: {
        ...rolData,
        fecha_actualizacion: new Date(),
        permisos: permisos
          ? {
              deleteMany: {},
              create: permisos.map((id) => ({
                permiso_id: id,
                recurso: 'empresa',
                accion: 'gestionar',
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
        usuarios: true,
        usuarios_empresa: true,
      },
    });
  }

  async eliminarRol(id_empresa: number, id: number) {
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol: id,
        id_empresa,
      },
      include: {
        usuarios: true,
        usuarios_empresa: true,
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    // Verificar si hay usuarios asignados
    if (rol.usuarios.length > 0 || rol.usuarios_empresa.length > 0) {
      throw new ConflictException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
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
    const { id_usuario, id_rol, id_empresa } = asignarRolDto;

    // Verificar que el rol pertenece a la empresa
    const rol = await this.prisma.rolEmpresa.findFirst({
      where: {
        id_rol,
        id_empresa,
      },
    });

    if (!rol) {
      throw new NotFoundException(
        `Rol con ID ${id_rol} no encontrado en la empresa`,
      );
    }

    // Verificar que el usuario está asociado a la empresa
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findUnique({
      where: {
        usuario_id_empresa_id: {
          usuario_id: id_usuario,
          empresa_id: id_empresa,
        },
      },
    });

    if (!usuarioEmpresa) {
      throw new NotFoundException(
        `Usuario con ID ${id_usuario} no está asociado a la empresa`,
      );
    }

    // Asignar el rol al usuario
    return this.prisma.usuarioRolEmpresa.create({
      data: {
        id_usuario,
        id_rol,
        fecha_inicio: new Date(),
      },
      include: {
        rolEmpresa: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });
  }
}
