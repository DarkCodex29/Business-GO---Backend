import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';

@Injectable()
export class ArchivosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArchivoDto: CreateArchivoDto, usuarioId: number) {
    return this.prisma.archivoMultimedia.create({
      data: {
        ...createArchivoDto,
        usuario_id: usuarioId,
      },
      include: {
        categoria: true,
        empresa: true,
        producto: true,
        documento: true,
      },
    });
  }

  async findAll(filters?: {
    categoria_id?: number;
    empresa_id?: number;
    producto_id?: number;
    documento_id?: number;
    activo?: boolean;
  }) {
    return this.prisma.archivoMultimedia.findMany({
      where: filters,
      include: {
        categoria: true,
        empresa: true,
        producto: true,
        documento: true,
        versiones: {
          orderBy: {
            numero_version: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async findOne(id: number) {
    const archivo = await this.prisma.archivoMultimedia.findUnique({
      where: { id_archivo: id },
      include: {
        categoria: true,
        empresa: true,
        producto: true,
        documento: true,
        versiones: {
          orderBy: {
            numero_version: 'desc',
          },
        },
      },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return archivo;
  }

  async update(id: number, updateArchivoDto: UpdateArchivoDto) {
    const archivo = await this.prisma.archivoMultimedia.findUnique({
      where: { id_archivo: id },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return this.prisma.archivoMultimedia.update({
      where: { id_archivo: id },
      data: updateArchivoDto,
      include: {
        categoria: true,
        empresa: true,
        producto: true,
        documento: true,
      },
    });
  }

  async remove(id: number) {
    const archivo = await this.prisma.archivoMultimedia.findUnique({
      where: { id_archivo: id },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return this.prisma.archivoMultimedia.delete({
      where: { id_archivo: id },
    });
  }

  async crearVersion(
    id: number,
    urlArchivo: string,
    cambios: string,
    usuarioId: number,
  ) {
    const archivo = await this.prisma.archivoMultimedia.findUnique({
      where: { id_archivo: id },
      include: {
        versiones: {
          orderBy: {
            numero_version: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    const ultimaVersion = archivo.versiones[0];
    const nuevoNumeroVersion = ultimaVersion
      ? ultimaVersion.numero_version + 1
      : 1;

    return this.prisma.versionArchivo.create({
      data: {
        id_archivo: id,
        numero_version: nuevoNumeroVersion,
        url_archivo: urlArchivo,
        cambios,
        usuario_id: usuarioId,
      },
    });
  }

  async obtenerVersiones(id: number) {
    const archivo = await this.prisma.archivoMultimedia.findUnique({
      where: { id_archivo: id },
      include: {
        versiones: {
          orderBy: {
            numero_version: 'desc',
          },
          include: {
            usuario: true,
          },
        },
      },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return archivo.versiones;
  }
}
