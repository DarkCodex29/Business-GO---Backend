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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotasDebitoService } from '../services/notas-debito.service';
import { CreateNotaDebitoDto } from '../dto/create-nota-debito.dto';
import { UpdateNotaDebitoDto } from '../dto/update-nota-debito.dto';

@ApiTags('Notas de Débito')
@Controller('notas-debito')
export class NotasDebitoController {
  constructor(private readonly notasDebitoService: NotasDebitoService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva nota de débito',
    description:
      'Crea una nueva nota de débito asociada a una factura existente',
  })
  @ApiResponse({
    status: 201,
    description: 'Nota de débito creada exitosamente',
    type: CreateNotaDebitoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la factura no está en estado válido',
  })
  @ApiResponse({
    status: 404,
    description: 'Factura, empresa o cliente no encontrado',
  })
  create(@Body() createNotaDebitoDto: CreateNotaDebitoDto) {
    return this.notasDebitoService.create(createNotaDebitoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las notas de débito',
    description: 'Retorna una lista de todas las notas de débito en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas de débito recuperada exitosamente',
    type: [CreateNotaDebitoDto],
  })
  findAll() {
    return this.notasDebitoService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una nota de débito por ID',
    description: 'Retorna los detalles de una nota de débito específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de débito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito encontrada exitosamente',
    type: CreateNotaDebitoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notasDebitoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una nota de débito',
    description: 'Actualiza los datos de una nota de débito existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de débito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito actualizada exitosamente',
    type: UpdateNotaDebitoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una nota de débito pagada o anulada',
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaDebitoDto: UpdateNotaDebitoDto,
  ) {
    return this.notasDebitoService.update(id, updateNotaDebitoDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una nota de débito',
    description: 'Elimina una nota de débito del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de débito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de débito eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una nota de débito pagada',
  })
  @ApiResponse({ status: 404, description: 'Nota de débito no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notasDebitoService.remove(id);
  }
}
