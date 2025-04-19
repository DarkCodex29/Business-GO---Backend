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
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { CreateVersionDto } from '../dto/create-version.dto';

@ApiTags('Archivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post('subir/:entityType/:entityId')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.crear')
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiOperation({ summary: 'Subir archivo multimedia' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'entityType',
    description: 'Tipo de entidad (producto, documento, etc)',
  })
  @ApiParam({ name: 'entityId', description: 'ID de la entidad' })
  subirArchivo(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.archivosService.subirArchivo(archivo, empresaId);
  }

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.crear')
  @ApiOperation({ summary: 'Crear archivo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createArchivoDto: CreateArchivoDto,
  ) {
    return this.archivosService.create(createArchivoDto, empresaId);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({ summary: 'Obtener archivos de la empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.archivosService.findAll(empresaId);
  }

  @Get('entidad/:entityType/:entityId')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({ summary: 'Obtener archivos de una entidad' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'entityType',
    description: 'Tipo de entidad (producto, documento, etc)',
  })
  @ApiParam({ name: 'entityId', description: 'ID de la entidad' })
  findByEntity(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.archivosService.getEntityFiles(entityType as any, entityId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.ver')
  @ApiOperation({ summary: 'Obtener archivo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.editar')
  @ApiOperation({ summary: 'Actualizar archivo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArchivoDto: UpdateArchivoDto,
  ) {
    return this.archivosService.update(id, updateArchivoDto, empresaId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.eliminar')
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.remove(id, empresaId);
  }

  @Post(':id/versiones')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.versiones.crear')
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiOperation({ summary: 'Crear versión' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  createVersion(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() createVersionDto: CreateVersionDto,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.archivosService.createVersion(id, createVersionDto, empresaId);
  }

  @Get(':id/versiones')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('archivos.versiones.ver')
  @ApiOperation({ summary: 'Obtener versiones' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  findVersions(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.archivosService.findVersions(id, empresaId);
  }
}
