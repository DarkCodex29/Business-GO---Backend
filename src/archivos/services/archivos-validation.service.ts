import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { TipoEntidad } from '../dto/upload-archivo.dto';

@Injectable()
export class ArchivosValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validar que el archivo existe y pertenece a la empresa
   */
  async validateArchivoExists(
    archivoId: number,
    empresaId: number,
  ): Promise<void> {
    const archivo = await this.prisma.archivoMultimedia.findFirst({
      where: {
        id_archivo: archivoId,
        empresa_id: empresaId,
        activo: true,
      },
    });

    if (!archivo) {
      throw new NotFoundException(
        `Archivo con ID ${archivoId} no encontrado para la empresa ${empresaId}`,
      );
    }
  }

  /**
   * Validar que la entidad existe y pertenece a la empresa
   */
  async validateEntityExists(
    entityType: TipoEntidad,
    entityId: number,
    empresaId: number,
  ): Promise<void> {
    let exists = false;

    switch (entityType) {
      case TipoEntidad.USUARIO:
        const usuario = await this.prisma.usuarioEmpresa.findFirst({
          where: {
            usuario_id: entityId,
            empresa_id: empresaId,
          },
        });
        exists = !!usuario;
        break;

      case TipoEntidad.EMPRESA:
        const empresa = await this.prisma.empresa.findFirst({
          where: {
            id_empresa: entityId,
          },
        });
        exists = !!empresa && entityId === empresaId;
        break;

      case TipoEntidad.PRODUCTO:
        const producto = await this.prisma.productoServicio.findFirst({
          where: {
            id_producto: entityId,
            id_empresa: empresaId,
          },
        });
        exists = !!producto;
        break;

      case TipoEntidad.DOCUMENTO:
        const documento = await this.prisma.documento.findFirst({
          where: {
            id_documento: entityId,
            empresa_id: empresaId,
          },
        });
        exists = !!documento;
        break;

      case TipoEntidad.CATEGORIA:
        const categoria = await this.prisma.categoriaArchivo.findFirst({
          where: {
            id_categoria_archivo: entityId,
          },
        });
        exists = !!categoria;
        break;

      default:
        throw new BadRequestException(
          `Tipo de entidad no válido: ${entityType}`,
        );
    }

    if (!exists) {
      throw new NotFoundException(
        `${entityType} con ID ${entityId} no encontrado para la empresa ${empresaId}`,
      );
    }
  }

  /**
   * Validar datos de creación de archivo
   */
  validateCreateData(createDto: CreateArchivoDto): void {
    // Validar nombre del archivo
    if (
      !createDto.nombre_archivo ||
      createDto.nombre_archivo.trim().length === 0
    ) {
      throw new BadRequestException('El nombre del archivo es requerido');
    }

    if (createDto.nombre_archivo.length > 255) {
      throw new BadRequestException(
        'El nombre del archivo no puede exceder 255 caracteres',
      );
    }

    // Validar tipo de archivo
    if (!createDto.tipo_archivo || createDto.tipo_archivo.trim().length === 0) {
      throw new BadRequestException('El tipo de archivo es requerido');
    }

    // Validar MIME type
    if (!createDto.mime_type || createDto.mime_type.trim().length === 0) {
      throw new BadRequestException('El tipo MIME es requerido');
    }

    // Validar URL del archivo
    if (!createDto.url_archivo || createDto.url_archivo.trim().length === 0) {
      throw new BadRequestException('La URL del archivo es requerida');
    }

    try {
      new URL(createDto.url_archivo);
    } catch {
      throw new BadRequestException('La URL del archivo no es válida');
    }

    // Validar tamaño del archivo
    if (!createDto.tamanio_bytes || createDto.tamanio_bytes <= 0) {
      throw new BadRequestException('El tamaño del archivo debe ser mayor a 0');
    }

    // Validar tamaño máximo (100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB en bytes
    if (createDto.tamanio_bytes > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo no puede exceder 100MB');
    }

    // Validar dimensiones si es imagen o video
    if (createDto.dimensiones && typeof createDto.dimensiones === 'object') {
      const { width, height } = createDto.dimensiones;
      if (width && (typeof width !== 'number' || width <= 0)) {
        throw new BadRequestException(
          'El ancho de la imagen debe ser un número positivo',
        );
      }
      if (height && (typeof height !== 'number' || height <= 0)) {
        throw new BadRequestException(
          'La altura de la imagen debe ser un número positivo',
        );
      }
    }
  }

  /**
   * Validar datos de actualización de archivo
   */
  validateUpdateData(updateDto: UpdateArchivoDto): void {
    // Validar nombre del archivo si se proporciona
    if (updateDto.nombre_archivo !== undefined) {
      if (
        !updateDto.nombre_archivo ||
        updateDto.nombre_archivo.trim().length === 0
      ) {
        throw new BadRequestException(
          'El nombre del archivo no puede estar vacío',
        );
      }

      if (updateDto.nombre_archivo.length > 255) {
        throw new BadRequestException(
          'El nombre del archivo no puede exceder 255 caracteres',
        );
      }
    }

    // Validar tipo de archivo si se proporciona
    if (updateDto.tipo_archivo !== undefined) {
      if (
        !updateDto.tipo_archivo ||
        updateDto.tipo_archivo.trim().length === 0
      ) {
        throw new BadRequestException(
          'El tipo de archivo no puede estar vacío',
        );
      }
    }

    // Validar MIME type si se proporciona
    if (updateDto.mime_type !== undefined) {
      if (!updateDto.mime_type || updateDto.mime_type.trim().length === 0) {
        throw new BadRequestException('El tipo MIME no puede estar vacío');
      }
    }

    // Validar URL del archivo si se proporciona
    if (updateDto.url_archivo !== undefined) {
      if (!updateDto.url_archivo || updateDto.url_archivo.trim().length === 0) {
        throw new BadRequestException(
          'La URL del archivo no puede estar vacía',
        );
      }

      try {
        new URL(updateDto.url_archivo);
      } catch {
        throw new BadRequestException('La URL del archivo no es válida');
      }
    }

    // Validar tamaño del archivo si se proporciona
    if (updateDto.tamanio_bytes !== undefined) {
      if (updateDto.tamanio_bytes <= 0) {
        throw new BadRequestException(
          'El tamaño del archivo debe ser mayor a 0',
        );
      }

      // Validar tamaño máximo (100MB)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB en bytes
      if (updateDto.tamanio_bytes > MAX_FILE_SIZE) {
        throw new BadRequestException('El archivo no puede exceder 100MB');
      }
    }

    // Validar dimensiones si se proporcionan
    if (updateDto.dimensiones && typeof updateDto.dimensiones === 'object') {
      const { width, height } = updateDto.dimensiones;
      if (width && (typeof width !== 'number' || width <= 0)) {
        throw new BadRequestException(
          'El ancho de la imagen debe ser un número positivo',
        );
      }
      if (height && (typeof height !== 'number' || height <= 0)) {
        throw new BadRequestException(
          'La altura de la imagen debe ser un número positivo',
        );
      }
    }
  }

  /**
   * Validar parámetros de paginación
   */
  validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new BadRequestException('La página debe ser mayor a 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100');
    }
  }

  /**
   * Validar filtros de búsqueda
   */
  validateSearchFilters(filters: any): void {
    // Validar tipo de archivo
    if (filters.tipo_archivo && typeof filters.tipo_archivo !== 'string') {
      throw new BadRequestException(
        'El tipo de archivo debe ser una cadena de texto',
      );
    }

    // Validar IDs numéricos
    const numericFields = [
      'categoria_id',
      'producto_id',
      'documento_id',
      'usuario_id',
    ];
    for (const field of numericFields) {
      if (filters[field] !== undefined) {
        const value = parseInt(filters[field]);
        if (isNaN(value) || value <= 0) {
          throw new BadRequestException(`${field} debe ser un número positivo`);
        }
      }
    }

    // Validar fechas
    if (filters.fecha_desde) {
      const fecha = new Date(filters.fecha_desde);
      if (isNaN(fecha.getTime())) {
        throw new BadRequestException('fecha_desde debe ser una fecha válida');
      }
    }

    if (filters.fecha_hasta) {
      const fecha = new Date(filters.fecha_hasta);
      if (isNaN(fecha.getTime())) {
        throw new BadRequestException('fecha_hasta debe ser una fecha válida');
      }
    }

    // Validar rango de fechas
    if (filters.fecha_desde && filters.fecha_hasta) {
      const desde = new Date(filters.fecha_desde);
      const hasta = new Date(filters.fecha_hasta);
      if (desde > hasta) {
        throw new BadRequestException(
          'fecha_desde no puede ser mayor que fecha_hasta',
        );
      }
    }

    // Validar tamaños
    const sizeFields = ['tamanio_min', 'tamanio_max'];
    for (const field of sizeFields) {
      if (filters[field] !== undefined) {
        const value = parseInt(filters[field]);
        if (isNaN(value) || value < 0) {
          throw new BadRequestException(
            `${field} debe ser un número no negativo`,
          );
        }
      }
    }

    // Validar rango de tamaños
    if (filters.tamanio_min && filters.tamanio_max) {
      const min = parseInt(filters.tamanio_min);
      const max = parseInt(filters.tamanio_max);
      if (min > max) {
        throw new BadRequestException(
          'tamanio_min no puede ser mayor que tamanio_max',
        );
      }
    }
  }

  /**
   * Validar tipo de archivo permitido
   */
  validateFileType(mimeType: string, allowedTypes?: string[]): void {
    const defaultAllowedTypes = [
      // Imágenes
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Videos
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      // Archivos comprimidos
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    const typesToCheck = allowedTypes || defaultAllowedTypes;

    if (!typesToCheck.includes(mimeType)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${mimeType}. Tipos permitidos: ${typesToCheck.join(', ')}`,
      );
    }
  }

  /**
   * Validar límites de almacenamiento por empresa
   */
  async validateStorageLimits(
    empresaId: number,
    newFileSize: number,
  ): Promise<void> {
    // Obtener el total actual de archivos de la empresa
    const totalSize = await this.prisma.archivoMultimedia.aggregate({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
    });

    const currentSize = totalSize._sum.tamanio_bytes || 0;
    const newTotalSize = currentSize + newFileSize;

    // Límite de 10GB por empresa (puede ser configurable según el plan)
    const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB en bytes

    if (newTotalSize > STORAGE_LIMIT) {
      const limitMB = Math.round(STORAGE_LIMIT / (1024 * 1024));
      const currentMB = Math.round(currentSize / (1024 * 1024));
      const newFileMB = Math.round(newFileSize / (1024 * 1024));

      throw new BadRequestException(
        `Límite de almacenamiento excedido. Límite: ${limitMB}MB, Actual: ${currentMB}MB, Nuevo archivo: ${newFileMB}MB`,
      );
    }
  }

  /**
   * Validar datos de versión de archivo
   */
  validateVersionData(createVersionDto: CreateVersionDto): void {
    // Validar cambios si se proporcionan
    if (createVersionDto.cambios !== undefined) {
      if (typeof createVersionDto.cambios !== 'string') {
        throw new BadRequestException(
          'Los cambios deben ser una cadena de texto',
        );
      }

      if (createVersionDto.cambios.length > 1000) {
        throw new BadRequestException(
          'Los cambios no pueden exceder 1000 caracteres',
        );
      }
    }
  }

  /**
   * Validar límite de versiones por archivo
   */
  async validateVersionLimit(archivoId: number): Promise<void> {
    const versionCount = await this.prisma.versionArchivo.count({
      where: { id_archivo: archivoId },
    });

    const MAX_VERSIONS = 50; // Límite máximo de versiones por archivo

    if (versionCount >= MAX_VERSIONS) {
      throw new BadRequestException(
        `Se ha alcanzado el límite máximo de ${MAX_VERSIONS} versiones para este archivo`,
      );
    }
  }

  /**
   * Validar que la categoría existe
   */
  async validateCategoriaExists(categoriaId: number): Promise<void> {
    const categoria = await this.prisma.categoriaArchivo.findUnique({
      where: { id_categoria_archivo: categoriaId },
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${categoriaId} no encontrada`,
      );
    }
  }

  /**
   * Validar permisos de usuario sobre archivo
   */
  async validateUserPermissions(
    archivoId: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<void> {
    const archivo = await this.prisma.archivoMultimedia.findFirst({
      where: {
        id_archivo: archivoId,
        empresa_id: empresaId,
        activo: true,
      },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo con ID ${archivoId} no encontrado`);
    }

    // Verificar que el usuario pertenece a la empresa
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
    });

    if (!usuarioEmpresa) {
      throw new BadRequestException(
        `Usuario ${usuarioId} no tiene permisos en la empresa ${empresaId}`,
      );
    }
  }
}
