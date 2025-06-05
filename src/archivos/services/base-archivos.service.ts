import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';
import { CreateVersionDto } from '../dto/create-version.dto';

// Interfaces para el módulo de archivos
export interface ArchivoFormatted {
  id_archivo: number;
  nombre_archivo: string;
  tipo_archivo: string;
  mime_type: string;
  url_archivo: string;
  tamanio_bytes: number;
  dimensiones?: any;
  metadata?: any;
  fecha_subida: Date;
  activo: boolean;
  usuario_id?: number | null;
  empresa_id?: number | null;
  producto_id?: number | null;
  documento_id?: number | null;
  categoria_id?: number | null;
  categoria?: {
    id_categoria_archivo: number;
    nombre: string;
    descripcion?: string | null;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
    email: string;
  } | null;
  versiones_count?: number;
  ultima_version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedArchivos {
  data: ArchivoFormatted[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MetricasArchivos {
  total_archivos: number;
  total_tamanio_bytes: number;
  total_tamanio_mb: number;
  archivos_por_tipo: {
    tipo: string;
    cantidad: number;
    tamanio_total_bytes: number;
  }[];
  archivos_por_categoria: {
    categoria: string;
    cantidad: number;
    tamanio_total_bytes: number;
  }[];
  archivos_recientes: ArchivoFormatted[];
  archivos_mas_grandes: ArchivoFormatted[];
  promedio_tamanio_bytes: number;
}

export interface VersionFormatted {
  id_version: number;
  numero_version: number;
  url_archivo: string;
  cambios?: string | null;
  fecha_version: Date;
  usuario_id: number;
  usuario?: {
    id_usuario: number;
    nombre: string;
    email: string;
  };
}

@Injectable()
export abstract class BaseArchivosService {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: any,
    protected readonly calculationService: any,
  ) {}

  // Template Methods - Métodos principales que siguen el patrón Template Method

  /**
   * Template method para crear archivo
   */
  async createArchivo(
    createDto: CreateArchivoDto,
    empresaId: number,
    usuarioId?: number,
  ): Promise<ArchivoFormatted> {
    // Validaciones previas
    await this.preCreateValidation(createDto, empresaId, usuarioId);

    // Preparar datos del archivo
    const archivoData = await this.prepareArchivoData(
      createDto,
      empresaId,
      usuarioId,
    );

    // Ejecutar creación
    const archivo = await this.executeCreateArchivo(archivoData);

    // Post-procesamiento
    await this.postCreateArchivo(archivo, empresaId);

    // Formatear respuesta
    return await this.formatArchivoResponse(archivo.id_archivo, empresaId);
  }

  /**
   * Template method para obtener archivos paginados
   */
  async getArchivos(
    empresaId: number,
    page: number = 1,
    limit: number = 10,
    filters: any = {},
  ): Promise<PaginatedArchivos> {
    // Validar parámetros de paginación
    this.validationService.validatePaginationParams(page, limit);

    // Validar filtros
    this.validationService.validateSearchFilters(filters);

    // Construir cláusula WHERE
    const whereClause = this.buildWhereClause(empresaId, filters);

    // Ejecutar consultas
    const [archivos, total] = await Promise.all([
      this.executeQuery(whereClause, page, limit),
      this.executeCount(whereClause),
    ]);

    // Formatear archivos
    const formattedArchivos = await Promise.all(
      archivos.map((archivo) =>
        this.formatArchivoResponse(archivo.id_archivo, empresaId),
      ),
    );

    return {
      data: formattedArchivos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Template method para actualizar archivo
   */
  async updateArchivo(
    id: number,
    updateDto: UpdateArchivoDto,
    empresaId: number,
  ): Promise<ArchivoFormatted> {
    // Validar existencia y permisos
    await this.validationService.validateArchivoExists(id, empresaId);

    // Validaciones previas
    await this.preUpdateValidation(id, updateDto, empresaId);

    // Ejecutar actualización
    const archivo = await this.executeUpdateArchivo(id, updateDto);

    // Post-procesamiento
    await this.postUpdateArchivo(archivo, empresaId);

    // Formatear respuesta
    return await this.formatArchivoResponse(id, empresaId);
  }

  /**
   * Template method para eliminar archivo
   */
  async deleteArchivo(id: number, empresaId: number): Promise<void> {
    // Validar existencia y permisos
    await this.validationService.validateArchivoExists(id, empresaId);

    // Pre-procesamiento
    await this.preDeleteArchivo(id, empresaId);

    // Ejecutar eliminación (soft delete)
    await this.executeDeleteArchivo(id);

    // Post-procesamiento
    await this.postDeleteArchivo(id, empresaId);
  }

  /**
   * Template method para crear versión de archivo
   */
  async createVersion(
    archivoId: number,
    createVersionDto: CreateVersionDto,
    empresaId: number,
    usuarioId: number,
  ): Promise<VersionFormatted> {
    // Validar archivo existe
    await this.validationService.validateArchivoExists(archivoId, empresaId);

    // Validaciones previas
    await this.preCreateVersionValidation(
      archivoId,
      createVersionDto,
      empresaId,
      usuarioId,
    );

    // Obtener siguiente número de versión
    const numeroVersion = await this.getNextVersionNumber(archivoId);

    // Ejecutar creación de versión
    const version = await this.executeCreateVersion(
      archivoId,
      createVersionDto,
      numeroVersion,
      usuarioId,
    );

    // Post-procesamiento
    await this.postCreateVersion(version, empresaId);

    // Formatear respuesta
    return await this.formatVersionResponse(version.id_version);
  }

  // Métodos abstractos que deben ser implementados por las clases hijas

  protected abstract preCreateValidation(
    createDto: CreateArchivoDto,
    empresaId: number,
    usuarioId?: number,
  ): Promise<void>;

  protected abstract postCreateArchivo(
    archivo: any,
    empresaId: number,
  ): Promise<void>;

  protected abstract preUpdateValidation(
    id: number,
    updateDto: UpdateArchivoDto,
    empresaId: number,
  ): Promise<void>;

  protected abstract postUpdateArchivo(
    archivo: any,
    empresaId: number,
  ): Promise<void>;

  protected abstract preDeleteArchivo(
    id: number,
    empresaId: number,
  ): Promise<void>;

  protected abstract postDeleteArchivo(
    id: number,
    empresaId: number,
  ): Promise<void>;

  protected abstract preCreateVersionValidation(
    archivoId: number,
    createVersionDto: CreateVersionDto,
    empresaId: number,
    usuarioId: number,
  ): Promise<void>;

  protected abstract postCreateVersion(
    version: any,
    empresaId: number,
  ): Promise<void>;

  // Métodos concretos reutilizables

  /**
   * Preparar datos del archivo para creación
   */
  protected async prepareArchivoData(
    createDto: CreateArchivoDto,
    empresaId: number,
    usuarioId?: number,
  ): Promise<any> {
    return {
      ...createDto,
      empresa_id: empresaId,
      usuario_id: usuarioId,
      activo: true,
      fecha_subida: new Date(),
    };
  }

  /**
   * Construir cláusula WHERE para consultas
   */
  protected buildWhereClause(empresaId: number, filters: any): any {
    const where: any = {
      empresa_id: empresaId,
      activo: true,
    };

    if (filters.tipo_archivo) {
      where.tipo_archivo = filters.tipo_archivo;
    }

    if (filters.categoria_id) {
      where.categoria_id = parseInt(filters.categoria_id);
    }

    if (filters.producto_id) {
      where.producto_id = parseInt(filters.producto_id);
    }

    if (filters.documento_id) {
      where.documento_id = parseInt(filters.documento_id);
    }

    if (filters.usuario_id) {
      where.usuario_id = parseInt(filters.usuario_id);
    }

    if (filters.nombre_archivo) {
      where.nombre_archivo = {
        contains: filters.nombre_archivo,
        mode: 'insensitive',
      };
    }

    if (filters.fecha_desde || filters.fecha_hasta) {
      where.fecha_subida = {};
      if (filters.fecha_desde) {
        where.fecha_subida.gte = new Date(filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        where.fecha_subida.lte = new Date(filters.fecha_hasta);
      }
    }

    if (filters.tamanio_min || filters.tamanio_max) {
      where.tamanio_bytes = {};
      if (filters.tamanio_min) {
        where.tamanio_bytes.gte = parseInt(filters.tamanio_min);
      }
      if (filters.tamanio_max) {
        where.tamanio_bytes.lte = parseInt(filters.tamanio_max);
      }
    }

    return where;
  }

  /**
   * Ejecutar consulta de archivos
   */
  protected async executeQuery(
    whereClause: any,
    page: number,
    limit: number,
  ): Promise<any[]> {
    const skip = (page - 1) * limit;

    return await this.prisma.archivoMultimedia.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { fecha_subida: 'desc' },
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
        versiones: {
          select: {
            numero_version: true,
          },
          orderBy: {
            numero_version: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  /**
   * Ejecutar conteo de archivos
   */
  protected async executeCount(whereClause: any): Promise<number> {
    return await this.prisma.archivoMultimedia.count({
      where: whereClause,
    });
  }

  /**
   * Ejecutar creación de archivo
   */
  protected async executeCreateArchivo(archivoData: any): Promise<any> {
    return await this.prisma.archivoMultimedia.create({
      data: archivoData,
    });
  }

  /**
   * Ejecutar actualización de archivo
   */
  protected async executeUpdateArchivo(
    id: number,
    updateDto: UpdateArchivoDto,
  ): Promise<any> {
    return await this.prisma.archivoMultimedia.update({
      where: { id_archivo: id },
      data: updateDto,
    });
  }

  /**
   * Ejecutar eliminación de archivo (soft delete)
   */
  protected async executeDeleteArchivo(id: number): Promise<any> {
    return await this.prisma.archivoMultimedia.update({
      where: { id_archivo: id },
      data: { activo: false },
    });
  }

  /**
   * Obtener siguiente número de versión
   */
  protected async getNextVersionNumber(archivoId: number): Promise<number> {
    const ultimaVersion = await this.prisma.versionArchivo.findFirst({
      where: { id_archivo: archivoId },
      orderBy: { numero_version: 'desc' },
    });

    return ultimaVersion ? ultimaVersion.numero_version + 1 : 1;
  }

  /**
   * Ejecutar creación de versión
   */
  protected async executeCreateVersion(
    archivoId: number,
    createVersionDto: CreateVersionDto,
    numeroVersion: number,
    usuarioId: number,
  ): Promise<any> {
    // Obtener URL del archivo original
    const archivo = await this.prisma.archivoMultimedia.findUnique({
      where: { id_archivo: archivoId },
    });

    return await this.prisma.versionArchivo.create({
      data: {
        id_archivo: archivoId,
        numero_version: numeroVersion,
        url_archivo: archivo?.url_archivo || '',
        cambios: createVersionDto.cambios,
        fecha_version: new Date(),
        usuario_id: usuarioId,
      },
    });
  }

  /**
   * Formatear respuesta de archivo
   */
  protected async formatArchivoResponse(
    id: number,
    empresaId: number,
  ): Promise<ArchivoFormatted> {
    const archivo = await this.prisma.archivoMultimedia.findFirst({
      where: {
        id_archivo: id,
        empresa_id: empresaId,
        activo: true,
      },
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
        versiones: {
          select: {
            numero_version: true,
          },
          orderBy: {
            numero_version: 'desc',
          },
        },
      },
    });

    if (!archivo) {
      throw new Error(`Archivo con ID ${id} no encontrado`);
    }

    return {
      id_archivo: archivo.id_archivo,
      nombre_archivo: archivo.nombre_archivo,
      tipo_archivo: archivo.tipo_archivo,
      mime_type: archivo.mime_type,
      url_archivo: archivo.url_archivo,
      tamanio_bytes: archivo.tamanio_bytes,
      dimensiones: archivo.dimensiones,
      metadata: archivo.metadata,
      fecha_subida: archivo.fecha_subida,
      activo: archivo.activo,
      usuario_id: archivo.usuario_id,
      empresa_id: archivo.empresa_id,
      producto_id: archivo.producto_id,
      documento_id: archivo.documento_id,
      categoria_id: archivo.categoria_id,
      categoria: archivo.categoria,
      usuario: archivo.usuario,
      versiones_count: archivo.versiones.length,
      ultima_version: archivo.versiones[0]?.numero_version || 0,
      createdAt: archivo.createdAt,
      updatedAt: archivo.updatedAt,
    };
  }

  /**
   * Formatear respuesta de versión
   */
  protected async formatVersionResponse(id: number): Promise<VersionFormatted> {
    const version = await this.prisma.versionArchivo.findUnique({
      where: { id_version: id },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!version) {
      throw new Error(`Versión con ID ${id} no encontrada`);
    }

    return {
      id_version: version.id_version,
      numero_version: version.numero_version,
      url_archivo: version.url_archivo,
      cambios: version.cambios,
      fecha_version: version.fecha_version,
      usuario_id: version.usuario_id,
      usuario: version.usuario,
    };
  }
}
