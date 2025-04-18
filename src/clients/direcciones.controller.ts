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
import { DireccionesService } from './direcciones.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Direcciones')
@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva dirección',
    description: 'Crea una nueva dirección para una empresa',
  })
  @ApiResponse({ status: 201, description: 'Dirección creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  create(@Body() createDireccionDto: CreateDireccionDto) {
    return this.direccionesService.create(createDireccionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las direcciones',
    description: 'Retorna una lista de todas las direcciones',
  })
  @ApiResponse({ status: 200, description: 'Lista de direcciones' })
  findAll() {
    return this.direccionesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una dirección',
    description: 'Retorna los detalles de una dirección específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: 'number' })
  @ApiResponse({ status: 200, description: 'Detalles de la dirección' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.direccionesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una dirección',
    description: 'Actualiza los datos de una dirección existente',
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Dirección actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDireccionDto: UpdateDireccionDto,
  ) {
    return this.direccionesService.update(id, updateDireccionDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una dirección',
    description: 'Elimina una dirección del sistema',
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: 'number' })
  @ApiResponse({ status: 200, description: 'Dirección eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.direccionesService.remove(id);
  }
}
