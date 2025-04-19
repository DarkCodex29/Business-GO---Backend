import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SubcategoriasService } from '../services/subcategorias.service';
import { CreateSubcategoriaDto } from '../dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from '../dto/update-subcategoria.dto';

@ApiTags('Subcategorías')
@ApiBearerAuth()
@Controller('empresas/:empresaId/subcategorias')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EMPRESA')
export class SubcategoriasController {
  constructor(private readonly subcategoriasService: SubcategoriasService) {}

  @Post(':categoriaId')
  @ApiOperation({ summary: 'Crear una nueva subcategoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'categoriaId',
    description: 'ID de la categoría',
    type: 'number',
  })
  create(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Body() createSubcategoriaDto: CreateSubcategoriaDto,
  ) {
    return this.subcategoriasService.create(
      +empresaId,
      +categoriaId,
      createSubcategoriaDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las subcategorías de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de subcategorías obtenida exitosamente',
  })
  findAll(@Param('empresaId') empresaId: string) {
    return this.subcategoriasService.findAll(+empresaId);
  }

  @Get(':categoriaId/:id')
  @ApiOperation({ summary: 'Obtener una subcategoría específica' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'categoriaId',
    description: 'ID de la categoría',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la subcategoría',
    type: 'number',
  })
  findOne(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Param('id') id: string,
  ) {
    return this.subcategoriasService.findOne(+empresaId, +categoriaId, +id);
  }

  @Patch(':categoriaId/:id')
  @ApiOperation({ summary: 'Actualizar una subcategoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'categoriaId',
    description: 'ID de la categoría',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la subcategoría',
    type: 'number',
  })
  update(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Param('id') id: string,
    @Body() updateSubcategoriaDto: UpdateSubcategoriaDto,
  ) {
    return this.subcategoriasService.update(
      +empresaId,
      +categoriaId,
      +id,
      updateSubcategoriaDto,
    );
  }

  @Delete(':categoriaId/:id')
  @ApiOperation({ summary: 'Eliminar una subcategoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'categoriaId',
    description: 'ID de la categoría',
    type: 'number',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la subcategoría',
    type: 'number',
  })
  remove(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Param('id') id: string,
  ) {
    return this.subcategoriasService.remove(+empresaId, +categoriaId, +id);
  }
}
