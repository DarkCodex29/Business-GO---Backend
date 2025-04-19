import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArchivosService } from '../services/archivos.service';
import { CreateArchivoDto } from '../dto/create-archivo.dto';
import { UpdateArchivoDto } from '../dto/update-archivo.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Archivos')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post('subir/:entityType/:entityId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Subir un archivo multimedia' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Archivo subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('entityType')
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento',
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.archivosService.uploadImage(file, entityType, entityId);
  }

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear archivo',
    description: 'Crea un nuevo archivo multimedia',
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  create(@Body() createArchivoDto: CreateArchivoDto, @Request() req) {
    return this.archivosService.create(createArchivoDto, req.user.id_usuario);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener archivos',
    description: 'Retorna una lista de archivos con filtros opcionales',
  })
  @ApiQuery({
    name: 'categoria_id',
    required: false,
    type: Number,
    description: 'ID de la categoría',
  })
  @ApiQuery({
    name: 'empresa_id',
    required: false,
    type: Number,
    description: 'ID de la empresa',
  })
  @ApiQuery({
    name: 'producto_id',
    required: false,
    type: Number,
    description: 'ID del producto',
  })
  @ApiQuery({
    name: 'documento_id',
    required: false,
    type: Number,
    description: 'ID del documento',
  })
  @ApiQuery({
    name: 'activo',
    required: false,
    type: Boolean,
    description: 'Estado del archivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos',
  })
  findAll(
    @Query('categoria_id') categoriaId?: number,
    @Query('empresa_id') empresaId?: number,
    @Query('producto_id') productoId?: number,
    @Query('documento_id') documentoId?: number,
    @Query('activo') activo?: boolean,
  ) {
    return this.archivosService.findAll({
      categoria_id: categoriaId,
      empresa_id: empresaId,
      producto_id: productoId,
      documento_id: documentoId,
      activo,
    });
  }

  @Get(':entityType/:entityId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener archivos de una entidad' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos obtenida exitosamente',
  })
  async getEntityFiles(
    @Param('entityType')
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento',
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.archivosService.getEntityFiles(entityType, entityId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener archivo',
    description: 'Retorna un archivo específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del archivo',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Actualizar archivo',
    description: 'Actualiza un archivo existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del archivo',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArchivoDto: UpdateArchivoDto,
  ) {
    return this.archivosService.update(id, updateArchivoDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Eliminar archivo',
    description: 'Elimina un archivo',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del archivo',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.remove(id);
  }

  @Post(':id/versiones')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear versión',
    description: 'Crea una nueva versión de un archivo',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del archivo',
    type: Number,
  })
  @ApiResponse({
    status: 201,
    description: 'Versión creada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  crearVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body('url_archivo') urlArchivo: string,
    @Body('cambios') cambios: string,
    @Request() req,
  ) {
    return this.archivosService.crearVersion(
      id,
      urlArchivo,
      cambios,
      req.user.id_usuario,
    );
  }

  @Get(':id/versiones')
  @ApiOperation({
    summary: 'Obtener versiones',
    description: 'Retorna todas las versiones de un archivo',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del archivo',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Versiones encontradas',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  obtenerVersiones(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.obtenerVersiones(id);
  }
}
