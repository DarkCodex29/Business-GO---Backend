import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { UploadArchivoDto, TipoEntidad } from '../dto/upload-archivo.dto';
import { PaginationDto } from '../dto/pagination.dto';
import {
  BaseArchivosService,
  ArchivoFormatted,
  PaginatedArchivos,
  MetricasArchivos,
  VersionFormatted,
} from './base-archivos.service';
import { ArchivosValidationService } from './archivos-validation.service';
import {
  ArchivosCalculationService,
  EstadisticasArchivo,
  TendenciaArchivos,
  AnalisisUso,
  ReporteAlmacenamiento,
} from './archivos-calculation.service';

@Injectable()
export class ArchivosService extends BaseArchivosService {
  protected readonly logger = new Logger(ArchivosService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: ArchivosValidationService,
    protected readonly calculationService: ArchivosCalculationService,
  ) {
    super(prisma, validationService, calculationService);
  }

  // Implementación de métodos abstractos del BaseArchivosService

  /**
   * Validaciones previas a la creación de archivo
   */
  protected async preCreateValidation(
    createDto: CreateArchivoDto,
    empresaId: number,
    usuarioId?: number,
  ): Promise<void> {
    this.logger.debug(
      `Validando creación de archivo: ${createDto.nombre_archivo}`,
    );

    // Validar datos básicos
    this.validationService.validateCreateData(createDto);

    // Validar tipo de archivo
    this.validationService.validateFileType(createDto.mime_type);

    // Validar límites de almacenamiento
    await this.validationService.validateStorageLimits(
      empresaId,
      createDto.tamanio_bytes,
    );

    // Validar categoría si se proporciona
    if (createDto.categoria_id) {
      await this.validationService.validateCategoriaExists(
        createDto.categoria_id,
      );
    }

    // Validar permisos de usuario si se proporciona
    if (usuarioId) {
      await this.validationService.validateUserPermissions(
        0, // No aplica para creación
        usuarioId,
        empresaId,
      );
    }
  }

  /**
   * Post-procesamiento después de crear archivo
   */
  protected async postCreateArchivo(
    archivo: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Archivo creado exitosamente: ${archivo.id_archivo} - ${archivo.nombre_archivo}`,
    );

    // Aquí se pueden agregar notificaciones, logs de auditoría, etc.
    // Por ejemplo: enviar notificación a usuarios relevantes
  }

  /**
   * Validaciones previas a la actualización de archivo
   */
  protected async preUpdateValidation(
    id: number,
    updateDto: UpdateArchivoDto,
    empresaId: number,
  ): Promise<void> {
    this.logger.debug(`Validando actualización de archivo: ${id}`);

    // Validar datos de actualización
    this.validationService.validateUpdateData(updateDto);

    // Validar tipo de archivo si se actualiza
    if (updateDto.mime_type) {
      this.validationService.validateFileType(updateDto.mime_type);
    }

    // Validar límites de almacenamiento si se cambia el tamaño
    if (updateDto.tamanio_bytes) {
      // Obtener tamaño actual
      const archivoActual = await this.prisma.archivoMultimedia.findUnique({
        where: { id_archivo: id },
      });

      if (archivoActual) {
        const diferenciaTamanio =
          updateDto.tamanio_bytes - archivoActual.tamanio_bytes;
        if (diferenciaTamanio > 0) {
          await this.validationService.validateStorageLimits(
            empresaId,
            diferenciaTamanio,
          );
        }
      }
    }

    // Validar categoría si se actualiza
    if (updateDto.categoria_id) {
      await this.validationService.validateCategoriaExists(
        updateDto.categoria_id,
      );
    }
  }

  /**
   * Post-procesamiento después de actualizar archivo
   */
  protected async postUpdateArchivo(
    archivo: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Archivo actualizado exitosamente: ${archivo.id_archivo} - ${archivo.nombre_archivo}`,
    );

    // Aquí se pueden agregar logs de auditoría, notificaciones, etc.
  }

  /**
   * Pre-procesamiento antes de eliminar archivo
   */
  protected async preDeleteArchivo(
    id: number,
    empresaId: number,
  ): Promise<void> {
    this.logger.debug(`Validando eliminación de archivo: ${id}`);

    // Verificar si el archivo tiene versiones
    const versionCount = await this.prisma.versionArchivo.count({
      where: { id_archivo: id },
    });

    if (versionCount > 0) {
      this.logger.warn(
        `Archivo ${id} tiene ${versionCount} versiones que también serán marcadas como inactivas`,
      );
    }
  }

  /**
   * Post-procesamiento después de eliminar archivo
   */
  protected async postDeleteArchivo(
    id: number,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(`Archivo eliminado exitosamente: ${id}`);

    // Marcar versiones como inactivas también (si el modelo lo soporta)
    // await this.prisma.versionArchivo.updateMany({
    //   where: { id_archivo: id },
    //   data: { activo: false },
    // });

    // Aquí se puede agregar lógica para eliminar el archivo físico del almacenamiento
  }

  /**
   * Validaciones previas a la creación de versión
   */
  protected async preCreateVersionValidation(
    archivoId: number,
    createVersionDto: CreateVersionDto,
    empresaId: number,
    usuarioId: number,
  ): Promise<void> {
    this.logger.debug(
      `Validando creación de versión para archivo: ${archivoId}`,
    );

    // Validar datos de versión
    this.validationService.validateVersionData(createVersionDto);

    // Validar límite de versiones
    await this.validationService.validateVersionLimit(archivoId);

    // Validar permisos de usuario
    await this.validationService.validateUserPermissions(
      archivoId,
      usuarioId,
      empresaId,
    );
  }

  /**
   * Post-procesamiento después de crear versión
   */
  protected async postCreateVersion(
    version: any,
    empresaId: number,
  ): Promise<void> {
    this.logger.log(
      `Versión creada exitosamente: ${version.id_version} - v${version.numero_version}`,
    );

    // Aquí se pueden agregar notificaciones, logs de auditoría, etc.
  }

  // Métodos públicos específicos del servicio

  /**
   * Subir archivo con validaciones completas
   */
  async uploadArchivo(
    uploadDto: UploadArchivoDto,
    empresaId: number,
    usuarioId?: number,
  ): Promise<ArchivoFormatted> {
    this.logger.debug(`Subiendo archivo: ${uploadDto.file.originalname}`);

    // Validar entidad asociada
    await this.validationService.validateEntityExists(
      uploadDto.entityType,
      uploadDto.entityId,
      empresaId,
    );

    // Extraer información del archivo
    const tipoArchivo = this.extractFileType(uploadDto.file.mimetype);
    const dimensiones = await this.extractDimensions(uploadDto.file);

    // Crear DTO para el archivo
    const createDto: CreateArchivoDto = {
      nombre_archivo: uploadDto.file.originalname,
      tipo_archivo: tipoArchivo,
      mime_type: uploadDto.file.mimetype,
      url_archivo: '', // Se asignará después de subir
      tamanio_bytes: uploadDto.file.size,
      dimensiones,
      metadata: uploadDto.metadata,
      categoria_id: uploadDto.categoria_id,
    };

    // Aquí iría la lógica para subir el archivo a un servicio de almacenamiento
    // Por ahora simulamos la URL
    createDto.url_archivo = `https://storage.example.com/files/${Date.now()}-${uploadDto.file.originalname}`;

    // Crear archivo usando el template method
    const archivo = await this.createArchivo(createDto, empresaId, usuarioId);

    // Asignar a la entidad correspondiente
    await this.assignToEntity(
      archivo.id_archivo,
      uploadDto.entityType,
      uploadDto.entityId,
    );

    return archivo;
  }

  /**
   * Buscar archivos por entidad
   */
  async findByEntity(
    entityType: TipoEntidad,
    entityId: number,
    empresaId: number,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedArchivos> {
    const { page = 1, limit = 10 } = paginationDto;

    const filters: any = {};
    switch (entityType) {
      case TipoEntidad.USUARIO:
        filters.usuario_id = entityId;
        break;
      case TipoEntidad.EMPRESA:
        filters.empresa_id = entityId;
        break;
      case TipoEntidad.PRODUCTO:
        filters.producto_id = entityId;
        break;
      case TipoEntidad.DOCUMENTO:
        filters.documento_id = entityId;
        break;
      case TipoEntidad.CATEGORIA:
        filters.categoria_id = entityId;
        break;
    }

    return await this.getArchivos(empresaId, page, limit, filters);
  }

  /**
   * Crear versión de archivo
   */
  async createVersionArchivo(
    archivoId: number,
    createVersionDto: CreateVersionDto,
    empresaId: number,
    usuarioId: number,
  ): Promise<VersionFormatted> {
    return await this.createVersion(
      archivoId,
      createVersionDto,
      empresaId,
      usuarioId,
    );
  }

  /**
   * Obtener versiones de un archivo
   */
  async getVersionesArchivo(
    archivoId: number,
    empresaId: number,
  ): Promise<VersionFormatted[]> {
    // Validar que el archivo existe
    await this.validationService.validateArchivoExists(archivoId, empresaId);

    const versiones = await this.prisma.versionArchivo.findMany({
      where: {
        id_archivo: archivoId,
      },
      orderBy: {
        numero_version: 'desc',
      },
    });

    // Obtener información de usuarios para las versiones
    const usuarioIds = versiones.map((v) => v.usuario_id).filter(Boolean);
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        id_usuario: { in: usuarioIds },
      },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
      },
    });

    const usuarioMap = new Map(usuarios.map((u) => [u.id_usuario, u]));

    return versiones.map((version) => ({
      id_version: version.id_version,
      numero_version: version.numero_version,
      url_archivo: version.url_archivo,
      cambios: version.cambios || undefined,
      fecha_version: version.fecha_version,
      usuario_id: version.usuario_id,
      usuario: usuarioMap.get(version.usuario_id),
    }));
  }

  /**
   * Buscar archivos por categoría
   */
  async findByCategoria(
    categoriaId: number,
    empresaId: number,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedArchivos> {
    const { page = 1, limit = 10 } = paginationDto;

    return await this.getArchivos(empresaId, page, limit, {
      categoria_id: categoriaId,
    });
  }

  /**
   * Buscar archivos por nombre
   */
  async searchByName(
    nombre: string,
    empresaId: number,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedArchivos> {
    const { page = 1, limit = 10 } = paginationDto;

    return await this.getArchivos(empresaId, page, limit, {
      nombre_archivo: nombre,
    });
  }

  // Métodos de métricas y reportes

  /**
   * Obtener métricas generales
   */
  async getMetricasGenerales(empresaId: number): Promise<MetricasArchivos> {
    return await this.calculationService.calculateMetricasGenerales(empresaId);
  }

  /**
   * Obtener estadísticas detalladas
   */
  async getEstadisticasArchivo(
    empresaId: number,
  ): Promise<EstadisticasArchivo> {
    return await this.calculationService.calculateEstadisticasArchivo(
      empresaId,
    );
  }

  /**
   * Obtener tendencia de archivos
   */
  async getTendenciaArchivos(
    empresaId: number,
    dias: number = 30,
  ): Promise<TendenciaArchivos[]> {
    return await this.calculationService.calculateTendenciaArchivos(
      empresaId,
      dias,
    );
  }

  /**
   * Obtener análisis de uso
   */
  async getAnalisisUso(empresaId: number): Promise<AnalisisUso> {
    return await this.calculationService.calculateAnalisisUso(empresaId);
  }

  /**
   * Obtener reporte de almacenamiento
   */
  async getReporteAlmacenamiento(
    empresaId: number,
  ): Promise<ReporteAlmacenamiento> {
    return await this.calculationService.calculateReporteAlmacenamiento(
      empresaId,
    );
  }

  /**
   * Obtener archivos duplicados
   */
  async getArchivosDuplicados(empresaId: number): Promise<{
    grupos_duplicados: {
      hash: string;
      archivos: ArchivoFormatted[];
      tamanio_total_desperdiciado: number;
    }[];
    total_espacio_desperdiciado: number;
  }> {
    return await this.calculationService.getArchivosDuplicados(empresaId);
  }

  // Métodos auxiliares privados

  /**
   * Extraer tipo de archivo desde MIME type
   */
  private extractFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'imagen';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'documento';
    if (mimeType.includes('word') || mimeType.includes('document'))
      return 'documento';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return 'hoja_calculo';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
      return 'presentacion';
    if (mimeType.includes('zip') || mimeType.includes('rar'))
      return 'comprimido';
    return 'otro';
  }

  /**
   * Extraer dimensiones de imagen/video
   */
  private async extractDimensions(
    file: Express.Multer.File,
  ): Promise<any | null> {
    // Aquí iría la lógica para extraer dimensiones usando librerías como sharp o ffprobe
    // Por ahora retornamos null
    return null;
  }

  /**
   * Asignar archivo a entidad específica
   */
  private async assignToEntity(
    archivoId: number,
    entityType: TipoEntidad,
    entityId: number,
  ): Promise<void> {
    const updateData: any = {};

    switch (entityType) {
      case TipoEntidad.USUARIO:
        updateData.usuario_id = entityId;
        break;
      case TipoEntidad.PRODUCTO:
        updateData.producto_id = entityId;
        break;
      case TipoEntidad.DOCUMENTO:
        updateData.documento_id = entityId;
        break;
      case TipoEntidad.CATEGORIA:
        updateData.categoria_id = entityId;
        break;
      // EMPRESA ya se asigna en la creación
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.archivoMultimedia.update({
        where: { id_archivo: archivoId },
        data: updateData,
      });
    }
  }

  // Métodos CRUD básicos (heredados pero con override para logging)

  /**
   * Crear archivo (override para logging adicional)
   */
  async create(
    createDto: CreateArchivoDto,
    empresaId: number,
    usuarioId?: number,
  ): Promise<ArchivoFormatted> {
    return await this.createArchivo(createDto, empresaId, usuarioId);
  }

  /**
   * Obtener todos los archivos paginados
   */
  async findAll(
    empresaId: number,
    paginationDto: PaginationDto = {},
    filters: any = {},
  ): Promise<PaginatedArchivos> {
    const { page = 1, limit = 10 } = paginationDto;
    return await this.getArchivos(empresaId, page, limit, filters);
  }

  /**
   * Obtener un archivo por ID
   */
  async findOne(id: number, empresaId: number): Promise<ArchivoFormatted> {
    return await this.formatArchivoResponse(id, empresaId);
  }

  /**
   * Actualizar archivo
   */
  async update(
    id: number,
    updateDto: UpdateArchivoDto,
    empresaId: number,
  ): Promise<ArchivoFormatted> {
    return await this.updateArchivo(id, updateDto, empresaId);
  }

  /**
   * Eliminar archivo (soft delete)
   */
  async remove(id: number, empresaId: number): Promise<void> {
    await this.deleteArchivo(id, empresaId);
  }
}
