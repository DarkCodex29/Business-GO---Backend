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
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { SubcategoriasService } from '../services/subcategorias.service';
import { CreateSubcategoriaDto } from '../dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from '../dto/update-subcategoria.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Subcategorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subcategorias')
export class SubcategoriasController {
  constructor(private readonly subcategoriasService: SubcategoriasService) {}

  @Post(':categoriaId')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear una nueva subcategoría' })
  @ApiParam({
    name: 'categoriaId',
    description: 'ID de la categoría',
    type: 'number',
  })
  create(
    @Param('categoriaId') categoriaId: string,
    @Body() createSubcategoriaDto: CreateSubcategoriaDto,
  ) {
    return this.subcategoriasService.create(
      +categoriaId,
      createSubcategoriaDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las subcategorías' })
  @ApiResponse({
    status: 200,
    description: 'Lista de subcategorías obtenida exitosamente',
  })
  findAll() {
    return this.subcategoriasService.findAll();
  }

  @Get(':categoriaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener una subcategoría específica' })
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
  findOne(@Param('id') id: string) {
    return this.subcategoriasService.findOne(+id);
  }

  @Patch(':categoriaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar una subcategoría' })
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
    @Param('id') id: string,
    @Body() updateSubcategoriaDto: UpdateSubcategoriaDto,
  ) {
    return this.subcategoriasService.update(+id, updateSubcategoriaDto);
  }

  @Delete(':categoriaId/:id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar una subcategoría' })
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
  remove(@Param('id') id: string) {
    return this.subcategoriasService.remove(+id);
  }
}
