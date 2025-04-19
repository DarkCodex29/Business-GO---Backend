import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';
import { CreateVersionDto } from '../dto/create-version.dto';

@Injectable()
export class ArchivosService {
  private readonly logger = new Logger(ArchivosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subirArchivo(file: Express.Multer.File, empresaId: number) {
    // Aquí iría la lógica para subir el archivo a un servicio de almacenamiento
    return {
      url_archivo: 'url_del_archivo',
      nombre_archivo: file.originalname,
      mime_type: file.mimetype,
      tamanio_bytes: file.size,
    };
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
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento' | 'categoria',
    entityId: number,
  ) {
    try {
      const whereClause = {
        ...(entityType === 'usuario' && { usuario_id: entityId }),
        ...(entityType === 'empresa' && { empresa_id: entityId }),
        ...(entityType === 'producto' && { producto_id: entityId }),
        ...(entityType === 'documento' && { documento_id: entityId }),
        ...(entityType === 'categoria' && { categoria_id: entityId }),
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

  async create(createArchivoDto: CreateArchivoDto, empresaId: number) {
    return this.prisma.archivoMultimedia.create({
      data: {
        ...createArchivoDto,
        empresa_id: empresaId,
        activo: true,
        fecha_subida: new Date(),
      },
    });
  }

  async findAll(empresaId: number) {
    return this.prisma.archivoMultimedia.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
    });
  }

  async findOne(id: number, empresaId: number) {
    const archivo = await this.prisma.archivoMultimedia.findFirst({
      where: {
        id_archivo: id,
        empresa_id: empresaId,
        activo: true,
      },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return archivo;
  }

  async update(
    id: number,
    updateArchivoDto: UpdateArchivoDto,
    empresaId: number,
  ) {
    await this.findOne(id, empresaId);

    return this.prisma.archivoMultimedia.update({
      where: { id_archivo: id },
      data: updateArchivoDto,
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    return this.prisma.archivoMultimedia.update({
      where: { id_archivo: id },
      data: { activo: false },
    });
  }

  async createVersion(
    id: number,
    createVersionDto: CreateVersionDto,
    empresaId: number,
  ) {
    const archivo = await this.findOne(id, empresaId);

    const ultimaVersion = await this.prisma.versionArchivo.findFirst({
      where: { id_archivo: archivo.id_archivo },
      orderBy: { numero_version: 'desc' },
    });

    const numeroVersion = ultimaVersion ? ultimaVersion.numero_version + 1 : 1;

    return this.prisma.versionArchivo.create({
      data: {
        ...createVersionDto,
        id_archivo: archivo.id_archivo,
        numero_version: numeroVersion,
        fecha_version: new Date(),
        url_archivo: archivo.url_archivo,
        usuario_id: archivo.usuario_id ?? 1,
      },
    });
  }

  async findVersions(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    return this.prisma.versionArchivo.findMany({
      where: {
        id_archivo: id,
      },
      orderBy: {
        numero_version: 'desc',
      },
    });
  }
}
