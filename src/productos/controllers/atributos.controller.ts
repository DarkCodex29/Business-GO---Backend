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
import { AtributosService } from '../services/atributos.service';
import { CreateAtributoDto } from '../dto/create-atributo.dto';
import { UpdateAtributoDto } from '../dto/update-atributo.dto';

@ApiTags('Atributos')
@Controller('atributos')
export class AtributosController {
  constructor(private readonly atributosService: AtributosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo atributo' })
  @ApiResponse({ status: 201, description: 'Atributo creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  create(@Body() createAtributoDto: CreateAtributoDto) {
    return this.atributosService.create(createAtributoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los atributos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de atributos obtenida exitosamente',
  })
  findAll() {
    return this.atributosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un atributo por ID' })
  @ApiResponse({ status: 200, description: 'Atributo encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.atributosService.findOne(id);
  }

  @Get('producto/:id_producto')
  @ApiOperation({ summary: 'Obtener todos los atributos de un producto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de atributos obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findByProducto(@Param('id_producto', ParseIntPipe) id_producto: number) {
    return this.atributosService.findByProducto(id_producto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un atributo' })
  @ApiResponse({
    status: 200,
    description: 'Atributo actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Atributo o producto no encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAtributoDto: UpdateAtributoDto,
  ) {
    return this.atributosService.update(id, updateAtributoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un atributo' })
  @ApiResponse({ status: 200, description: 'Atributo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.atributosService.remove(id);
  }
}
