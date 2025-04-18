import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Archivos')
@Controller('archivos')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/:entityType/:entityId')
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
    return this.filesService.uploadImage(file, entityType, entityId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un archivo multimedia' })
  @ApiResponse({ status: 200, description: 'Archivo eliminado exitosamente' })
  async deleteFile(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.deleteFile(id);
  }

  @Get(':entityType/:entityId')
  @Public()
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
    return this.filesService.getEntityFiles(entityType, entityId);
  }
}
