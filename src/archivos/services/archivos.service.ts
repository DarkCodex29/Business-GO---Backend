import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';

@Injectable()
export class ArchivosService {
  private readonly logger = new Logger(ArchivosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async uploadImage(
    file: Express.Multer.File,
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento',
    entityId: number,
  ) {
    try {
      // Aquí iría la lógica de subida del archivo a un servicio de almacenamiento
      const url = `https://storage.example.com/${file.filename}`;

      const whereClause = {
        ...(entityType === 'usuario' && { usuario_id: entityId }),
        ...(entityType === 'empresa' && { empresa_id: entityId }),
        ...(entityType === 'producto' && { producto_id: entityId }),
        ...(entityType === 'documento' && { documento_id: entityId }),
      };

      return await this.prisma.archivoMultimedia.create({
        data: {
          nombre_archivo: file.originalname,
          tipo_archivo: file.mimetype.split('/')[0],
          mime_type: file.mimetype,
          url_archivo: url,
          tamanio_bytes: file.size,
          ...whereClause,
        },
      });
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(id: number) {
    try {
      const archivo = await this.prisma.archivoMultimedia.findUnique({
        where: { id_archivo: id },
      });

      if (!archivo) {
        throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
      }

      // Aquí iría la lógica para eliminar el archivo del servicio de almacenamiento

      return await this.prisma.archivoMultimedia.delete({
        where: { id_archivo: id },
      });
    } catch (error) {
      this.logger.error(`Error al eliminar archivo: ${error.message}`);
      throw error;
    }
  }

  async getEntityFiles(
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento',
    entityId: number,
  ) {
    try {
      const whereClause = {
        ...(entityType === 'usuario' && { usuario_id: entityId }),
        ...(entityType === 'empresa' && { empresa_id: entityId }),
        ...(entityType === 'producto' && { producto_id: entityId }),
        ...(entityType === 'documento' && { documento_id: entityId }),
      };

      return await this.prisma.archivoMultimedia.findMany({
        where: whereClause,
        orderBy: { fecha_subida: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error al obtener archivos: ${error.message}`);
      throw error;
    }
  }

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
