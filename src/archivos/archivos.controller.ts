import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArchivosService } from './services/archivos.service';
import { CreateArchivoDto } from './dto/create-archivo.dto';
import { UpdateArchivoDto } from './dto/update-archivo.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { UploadArchivoDto, TipoEntidad } from './dto/upload-archivo.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../common/decorators/empresa-permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import { ROLES } from '../common/constants/roles.constant';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Archivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  // Endpoints de subida y gestión de archivos

  @Post(':empresaId/upload')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.WRITE] })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir archivo multimedia',
    description:
      'Sube un archivo multimedia y lo asocia a una entidad específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Tipo de archivo no permitido o tamaño excedido',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa o entidad no encontrada',
  })
  async uploadArchivo(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: Omit<UploadArchivoDto, 'file'>,
    @GetUser('id') usuarioId: number,
  ) {
    const fullUploadDto: UploadArchivoDto = {
      ...uploadDto,
      file,
    };
    return this.archivosService.uploadArchivo(
      fullUploadDto,
      empresaId,
      usuarioId,
    );
  }

  @Post(':empresaId')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.WRITE] })
  @ApiOperation({
    summary: 'Crear archivo',
    description: 'Crea un nuevo registro de archivo manualmente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Archivo creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createArchivoDto: CreateArchivoDto,
    @GetUser('id') usuarioId: number,
  ) {
    return this.archivosService.create(createArchivoDto, empresaId, usuarioId);
  }

  // Endpoints de consulta

  @Get(':empresaId')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener archivos de la empresa',
    description:
      'Retorna una lista paginada de archivos de la empresa con filtros opcionales',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'tipo_archivo',
    required: false,
    description: 'Filtrar por tipo de archivo',
  })
  @ApiQuery({
    name: 'categoria_id',
    required: false,
    description: 'Filtrar por categoría',
  })
  @ApiQuery({
    name: 'nombre_archivo',
    required: false,
    description: 'Buscar por nombre',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos recuperada exitosamente',
  })
  async findAll(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query() paginationDto: PaginationDto,
    @Query() filters: any,
  ) {
    return this.archivosService.findAll(empresaId, paginationDto, filters);
  }

  @Get(':empresaId/entity/:entityType/:entityId')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener archivos de una entidad',
    description: 'Retorna archivos asociados a una entidad específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'entityType',
    enum: TipoEntidad,
    description: 'Tipo de entidad',
  })
  @ApiParam({ name: 'entityId', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos recuperada exitosamente',
  })
  async findByEntity(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('entityType') entityType: TipoEntidad,
    @Param('entityId', ParseIntPipe) entityId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.archivosService.findByEntity(
      entityType,
      entityId,
      empresaId,
      paginationDto,
    );
  }

  @Get(':empresaId/categoria/:categoriaId')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener archivos por categoría',
    description: 'Retorna archivos de una categoría específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'categoriaId', description: 'ID de la categoría' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos recuperada exitosamente',
  })
  async findByCategoria(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.archivosService.findByCategoria(
      categoriaId,
      empresaId,
      paginationDto,
    );
  }

  @Get(':empresaId/search')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Buscar archivos por nombre',
    description:
      'Busca archivos que contengan el texto especificado en el nombre',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'nombre',
    description: 'Texto a buscar en el nombre del archivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados de búsqueda recuperados exitosamente',
  })
  async searchByName(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('nombre') nombre: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.archivosService.searchByName(nombre, empresaId, paginationDto);
  }

  @Get(':empresaId/:id')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener archivo por ID',
    description: 'Retorna los detalles de un archivo específico',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo encontrado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.findOne(id, empresaId);
  }

  // Endpoints de actualización y eliminación

  @Patch(':empresaId/:id')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.WRITE] })
  @ApiOperation({
    summary: 'Actualizar archivo',
    description: 'Actualiza los metadatos de un archivo existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArchivoDto: UpdateArchivoDto,
  ) {
    return this.archivosService.update(id, updateArchivoDto, empresaId);
  }

  @Delete(':empresaId/:id')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.WRITE] })
  @ApiOperation({
    summary: 'Eliminar archivo',
    description: 'Elimina un archivo del sistema (soft delete)',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 204,
    description: 'Archivo eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.archivosService.remove(id, empresaId);
  }

  // Endpoints de versiones

  @Post(':empresaId/:id/versions')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.WRITE] })
  @ApiOperation({
    summary: 'Crear versión de archivo',
    description: 'Crea una nueva versión de un archivo existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 201,
    description: 'Versión creada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async createVersion(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() createVersionDto: CreateVersionDto,
    @GetUser('id') usuarioId: number,
  ) {
    return this.archivosService.createVersionArchivo(
      id,
      createVersionDto,
      empresaId,
      usuarioId,
    );
  }

  @Get(':empresaId/:id/versions')
  @Roles(ROLES.CLIENTE, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener versiones de archivo',
    description: 'Retorna todas las versiones de un archivo específico',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de versiones recuperada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async findVersions(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.getVersionesArchivo(id, empresaId);
  }

  // Endpoints de métricas y reportes

  @Get(':empresaId/metrics/general')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener métricas generales',
    description: 'Retorna métricas generales de archivos de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Métricas recuperadas exitosamente',
  })
  async getMetricasGenerales(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.archivosService.getMetricasGenerales(empresaId);
  }

  @Get(':empresaId/metrics/statistics')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener estadísticas detalladas',
    description: 'Retorna estadísticas detalladas de archivos',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas recuperadas exitosamente',
  })
  async getEstadisticasArchivo(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.archivosService.getEstadisticasArchivo(empresaId);
  }

  @Get(':empresaId/metrics/trends')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener tendencias de archivos',
    description: 'Retorna tendencias de subida de archivos por días',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiQuery({
    name: 'dias',
    required: false,
    description: 'Número de días a analizar (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencias recuperadas exitosamente',
  })
  async getTendenciaArchivos(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('dias', ParseIntPipe) dias: number = 30,
  ) {
    return this.archivosService.getTendenciaArchivos(empresaId, dias);
  }

  @Get(':empresaId/metrics/usage')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener análisis de uso',
    description: 'Retorna análisis de uso de archivos y categorías',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Análisis de uso recuperado exitosamente',
  })
  async getAnalisisUso(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.archivosService.getAnalisisUso(empresaId);
  }

  @Get(':empresaId/metrics/storage')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener reporte de almacenamiento',
    description: 'Retorna información sobre el uso de almacenamiento',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Reporte de almacenamiento recuperado exitosamente',
  })
  async getReporteAlmacenamiento(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.archivosService.getReporteAlmacenamiento(empresaId);
  }

  @Get(':empresaId/metrics/duplicates')
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @EmpresaPermissions({ permissions: [PERMISSIONS.DOCUMENTOS.READ] })
  @ApiOperation({
    summary: 'Obtener archivos duplicados',
    description: 'Retorna archivos duplicados para optimizar almacenamiento',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Archivos duplicados recuperados exitosamente',
  })
  async getArchivosDuplicados(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.archivosService.getArchivosDuplicados(empresaId);
  }
}
