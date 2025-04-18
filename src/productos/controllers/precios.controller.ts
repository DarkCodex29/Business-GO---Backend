import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PreciosService } from '../services/precios.service';
import { CreatePrecioDto } from '../dto/create-precio.dto';
import { UpdatePrecioDto } from '../dto/update-precio.dto';

@ApiTags('Precios')
@Controller('precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo precio' })
  @ApiResponse({ status: 201, description: 'Precio creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  create(@Body() createPrecioDto: CreatePrecioDto) {
    return this.preciosService.create(createPrecioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los precios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de precios obtenida exitosamente',
  })
  findAll() {
    return this.preciosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un precio por ID' })
  @ApiResponse({ status: 200, description: 'Precio encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  findOne(@Param('id') id: string) {
    return this.preciosService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un precio' })
  @ApiResponse({ status: 200, description: 'Precio actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  update(@Param('id') id: string, @Body() updatePrecioDto: UpdatePrecioDto) {
    return this.preciosService.update(+id, updatePrecioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un precio' })
  @ApiResponse({ status: 200, description: 'Precio eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  remove(@Param('id') id: string) {
    return this.preciosService.remove(+id);
  }
}
