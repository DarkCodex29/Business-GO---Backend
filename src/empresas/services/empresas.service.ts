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
import { EmpresaValidationService } from './empresa-validation.service';

@Injectable()
export class EmpresasService {
  private readonly logger = new Logger(EmpresasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly empresaValidationService: EmpresaValidationService,
  ) {}

  async create(createEmpresaDto: CreateEmpresaDto) {
    try {
      // Validaciones usando el servicio especializado
      this.empresaValidationService.validateRuc(createEmpresaDto.ruc);
      this.empresaValidationService.validateTelefono(createEmpresaDto.telefono);
      this.empresaValidationService.validateTipoEmpresa(
        createEmpresaDto.tipo_empresa,
      );

      if (createEmpresaDto.tipo_contribuyente) {
        this.empresaValidationService.validateTipoContribuyente(
          createEmpresaDto.tipo_contribuyente,
        );
      }

      // Validar RUC único
      await this.empresaValidationService.validateUniqueRuc(
        createEmpresaDto.ruc,
      );

      const empresa = await this.prisma.empresa.create({
        data: {
          nombre: createEmpresaDto.nombre,
          razon_social: createEmpresaDto.razon_social,
          nombre_comercial: createEmpresaDto.nombre_comercial,
          ruc: createEmpresaDto.ruc,
          telefono: createEmpresaDto.telefono,
          tipo_empresa: createEmpresaDto.tipo_empresa.toUpperCase(),
          tipo_contribuyente:
            createEmpresaDto.tipo_contribuyente?.toUpperCase() ?? 'RER',
          estado: 'activo',
          latitud: createEmpresaDto.latitud?.toString() ?? '0',
          longitud: createEmpresaDto.longitud?.toString() ?? '0',
        },
      });

      this.logger.log(
        `Empresa creada exitosamente: ${empresa.nombre} (ID: ${empresa.id_empresa})`,
      );
      return empresa;
    } catch (error) {
      this.logger.error(`Error al crear empresa: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una empresa con este RUC');
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

  async findOne(id: number) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: id },
      include: {
        direcciones: true,
        usuarios: {
          include: {
            usuario: true,
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    return empresa;
  }

  async update(id: number, updateEmpresaDto: UpdateEmpresaDto) {
    try {
      return await this.prisma.empresa.update({
        where: { id_empresa: id },
        data: updateEmpresaDto,
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

  async remove(id: number) {
    try {
      await this.prisma.empresa.delete({
        where: { id_empresa: id },
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
          departamento: createDireccionDto.departamento,
          provincia: createDireccionDto.provincia,
          distrito: createDireccionDto.distrito,
          direccion: createDireccionDto.direccion,
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear dirección: ${error.message}`);
      throw error;
    }
  }

  async updateDireccion(
    empresaId: number,
    direccionId: number,
    updateDireccionDto: UpdateDireccionDto,
  ) {
    try {
      return await this.prisma.direccion.update({
        where: { id_direccion: direccionId },
        data: {
          direccion: updateDireccionDto.direccion,
          departamento: updateDireccionDto.departamento,
          provincia: updateDireccionDto.provincia,
          distrito: updateDireccionDto.distrito,
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

  async removeDireccion(empresaId: number, direccionId: number) {
    try {
      await this.prisma.direccion.delete({
        where: { id_direccion: direccionId },
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
    empresaId: number,
    usuarioId: number,
    esDueno: boolean = false,
  ) {
    try {
      return await this.prisma.usuarioEmpresa.create({
        data: {
          usuario_id: usuarioId,
          empresa_id: empresaId,
          es_dueno: esDueno,
        },
        include: {
          usuario: true,
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

  async removerUsuario(empresaId: number, usuarioId: number) {
    try {
      await this.prisma.usuarioEmpresa.delete({
        where: {
          usuario_id_empresa_id: {
            usuario_id: usuarioId,
            empresa_id: empresaId,
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
