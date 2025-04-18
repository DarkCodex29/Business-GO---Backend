import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../dto/update-empresa.dto';
import { CreateDireccionDto } from '../dto/create-direccion.dto';
import { UpdateDireccionDto } from '../dto/update-direccion.dto';

@Injectable()
export class EmpresasService {
  private readonly logger = new Logger(EmpresasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createEmpresaDto: CreateEmpresaDto) {
    try {
      return await this.prisma.empresa.create({
        data: {
          nombre: createEmpresaDto.nombre,
          razon_social: createEmpresaDto.razon_social,
          nombre_comercial: createEmpresaDto.nombre_comercial,
          ruc: createEmpresaDto.ruc,
          telefono: createEmpresaDto.telefono,
          tipo_empresa: createEmpresaDto.tipo_empresa,
          tipo_contribuyente: createEmpresaDto.tipo_contribuyente ?? 'RER',
          estado: 'activo',
          latitud: createEmpresaDto.latitud,
          longitud: createEmpresaDto.longitud,
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear empresa: ${error.message}`);
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una empresa con este nombre');
      }
      throw error;
    }
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { nombre: { contains: search } },
            { tipo_empresa: { contains: search } },
          ],
        }
      : {};

    const [empresas, total] = await Promise.all([
      this.prisma.empresa.findMany({
        skip,
        take: limit,
        where,
        include: {
          direcciones: true,
          usuarios: {
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
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      }),
      this.prisma.empresa.count({ where }),
    ]);

    return {
      data: empresas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: BigInt(id) },
      include: {
        direcciones: true,
        usuarios: {
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
        },
        clientes: {
          include: {
            cliente: {
              select: {
                id_cliente: true,
                nombre: true,
                email: true,
                telefono: true,
              },
            },
          },
        },
        productos: {
          include: {
            categoria: true,
            subcategoria: true,
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    return empresa;
  }

  async update(id: string, updateEmpresaDto: UpdateEmpresaDto) {
    try {
      return await this.prisma.empresa.update({
        where: { id_empresa: BigInt(id) },
        data: {
          nombre: updateEmpresaDto.nombre,
          telefono: updateEmpresaDto.telefono,
          tipo_empresa: updateEmpresaDto.tipo_empresa,
          latitud: updateEmpresaDto.latitud,
          longitud: updateEmpresaDto.longitud,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una empresa con este nombre');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.empresa.delete({
        where: { id_empresa: BigInt(id) },
      });
      return { message: 'Empresa eliminada correctamente' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  // Métodos para gestionar direcciones
  async createDireccion(createDireccionDto: CreateDireccionDto) {
    try {
      return await this.prisma.direccion.create({
        data: {
          empresa: {
            connect: { id_empresa: createDireccionDto.id_empresa },
          },
          tipo_direccion: createDireccionDto.tipo_direccion ?? 'principal',
          departamento: createDireccionDto.departamento,
          provincia: createDireccionDto.provincia,
          distrito: createDireccionDto.distrito,
          direccion: createDireccionDto.direccion,
          codigo_postal: createDireccionDto.codigo_postal,
          referencia: createDireccionDto.referencia,
          latitud: createDireccionDto.latitud,
          longitud: createDireccionDto.longitud,
          activa: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear dirección: ${error.message}`);
      throw error;
    }
  }

  async updateDireccion(
    empresaId: string,
    direccionId: string,
    updateDireccionDto: UpdateDireccionDto,
  ) {
    try {
      return await this.prisma.direccion.update({
        where: { id_direccion: BigInt(direccionId) },
        data: {
          direccion: updateDireccionDto.direccion,
          latitud: updateDireccionDto.latitud,
          longitud: updateDireccionDto.longitud,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Dirección con ID ${direccionId} no encontrada`,
        );
      }
      throw error;
    }
  }

  async removeDireccion(empresaId: string, direccionId: string) {
    try {
      await this.prisma.direccion.delete({
        where: { id_direccion: BigInt(direccionId) },
      });
      return { message: 'Dirección eliminada correctamente' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Dirección con ID ${direccionId} no encontrada`,
        );
      }
      throw error;
    }
  }

  // Métodos para gestionar la relación usuario-empresa
  async asignarUsuario(
    empresaId: string,
    usuarioId: string,
    esDueno: boolean = false,
  ) {
    try {
      return await this.prisma.usuarioEmpresa.create({
        data: {
          usuario_id: BigInt(usuarioId),
          empresa_id: BigInt(empresaId),
          es_dueno: esDueno,
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true,
              telefono: true,
            },
          },
          empresa: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'El usuario ya está asignado a esta empresa',
        );
      }
      if (error.code === 'P2003') {
        throw new NotFoundException(
          `Usuario con ID ${usuarioId} o empresa con ID ${empresaId} no encontrado`,
        );
      }
      throw error;
    }
  }

  async removerUsuario(empresaId: string, usuarioId: string) {
    try {
      await this.prisma.usuarioEmpresa.delete({
        where: {
          usuario_id_empresa_id: {
            usuario_id: BigInt(usuarioId),
            empresa_id: BigInt(empresaId),
          },
        },
      });
      return { message: 'Usuario removido de la empresa correctamente' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('La relación usuario-empresa no existe');
      }
      throw error;
    }
  }
}
