import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubcategoriasService } from '../services/subcategorias.service';
import { CreateSubcategoriaDto } from '../dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from '../dto/update-subcategoria.dto';

@ApiTags('subcategorias')
@Controller('subcategorias')
export class SubcategoriasController {
  constructor(private readonly subcategoriasService: SubcategoriasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva subcategoría' })
  @ApiResponse({ status: 201, description: 'Subcategoría creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  create(@Body() createSubcategoriaDto: CreateSubcategoriaDto) {
    return this.subcategoriasService.create(createSubcategoriaDto);
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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una subcategoría por ID' })
  @ApiResponse({
    status: 200,
    description: 'Subcategoría encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Subcategoría no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subcategoriasService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una subcategoría' })
  @ApiResponse({
    status: 200,
    description: 'Subcategoría actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Subcategoría o categoría no encontrada',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubcategoriaDto: UpdateSubcategoriaDto,
  ) {
    return this.subcategoriasService.update(id, updateSubcategoriaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una subcategoría' })
  @ApiResponse({
    status: 200,
    description: 'Subcategoría eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Subcategoría no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subcategoriasService.remove(id);
  }
}
