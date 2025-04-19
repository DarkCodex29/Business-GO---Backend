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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArchivosService } from '../services/archivos.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Archivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('archivos')
@Roles('ADMIN', 'EMPRESA')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post(':empresaId/subir/:entityType/:entityId')
  @EmpresaPermissions('archivos.crear')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir archivo multimedia',
    description: 'Sube un archivo multimedia y lo asocia a una entidad',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'entityType', description: 'Tipo de entidad' })
  @ApiParam({ name: 'entityId', description: 'ID de la entidad' })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente',
    type: CreateArchivoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tipo de archivo no permitido o tamaño excedido',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa o entidad no encontrada',
  })
  subirArchivo(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.archivosService.subirArchivo(file, empresaId);
  }

  @Post(':empresaId')
  @EmpresaPermissions('archivos.crear')
  @ApiOperation({
    summary: 'Crear archivo',
    description: 'Crea un nuevo registro de archivo',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Archivo creado exitosamente',
    type: CreateArchivoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createArchivoDto: CreateArchivoDto,
  ) {
    return this.archivosService.create(createArchivoDto, empresaId);
  }

  @Get(':empresaId')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({
    summary: 'Obtener archivos de la empresa',
    description: 'Retorna una lista de todos los archivos de la empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos recuperada exitosamente',
    type: [CreateArchivoDto],
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.archivosService.findAll(empresaId);
  }

  @Get(':empresaId/entidad/:entityType/:entityId')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({
    summary: 'Obtener archivos de una entidad',
    description:
      'Retorna una lista de archivos asociados a una entidad específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'entityType', description: 'Tipo de entidad' })
  @ApiParam({ name: 'entityId', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos recuperada exitosamente',
    type: [CreateArchivoDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa o entidad no encontrada',
  })
  getEntityFiles(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.archivosService.getEntityFiles(entityType as any, entityId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({
    summary: 'Obtener archivo por ID',
    description: 'Retorna los detalles de un archivo específico',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo encontrado exitosamente',
    type: CreateArchivoDto,
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.findOne(id, empresaId);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('archivos.editar')
  @ApiOperation({
    summary: 'Actualizar archivo',
    description: 'Actualiza los datos de un archivo existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo actualizado exitosamente',
    type: UpdateArchivoDto,
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArchivoDto: UpdateArchivoDto,
  ) {
    return this.archivosService.update(id, updateArchivoDto, empresaId);
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('archivos.eliminar')
  @ApiOperation({
    summary: 'Eliminar archivo',
    description: 'Elimina un archivo del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.remove(id, empresaId);
  }

  @Post(':empresaId/:id/versiones')
  @EmpresaPermissions('archivos.crear')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear versión',
    description: 'Crea una nueva versión de un archivo existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 201,
    description: 'Versión creada exitosamente',
    type: CreateArchivoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tipo de archivo no permitido o tamaño excedido',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  createVersion(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const createVersionDto = new CreateVersionDto();
    return this.archivosService.createVersion(id, createVersionDto, empresaId);
  }

  @Get(':empresaId/:id/versiones')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({
    summary: 'Obtener versiones',
    description: 'Retorna una lista de versiones de un archivo',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de versiones recuperada exitosamente',
    type: [CreateArchivoDto],
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  findVersions(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.findVersions(id, empresaId);
  }
}
