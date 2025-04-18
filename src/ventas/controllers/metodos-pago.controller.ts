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
import { MetodosPagoService } from '../services/metodos-pago.service';
import { CreateMetodoPagoDto } from '../dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from '../dto/update-metodo-pago.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Métodos de Pago')
@Controller('metodos-pago')
export class MetodosPagoController {
  constructor(private readonly metodosPagoService: MetodosPagoService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo método de pago',
    description: 'Crea un nuevo método de pago en el sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Método de pago creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createMetodoPagoDto: CreateMetodoPagoDto) {
    return this.metodosPagoService.create(createMetodoPagoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los métodos de pago',
    description: 'Retorna una lista de todos los métodos de pago',
  })
  @ApiResponse({ status: 200, description: 'Lista de métodos de pago' })
  findAll() {
    return this.metodosPagoService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un método de pago',
    description: 'Retorna los detalles de un método de pago específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del método de pago',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Detalles del método de pago' })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.metodosPagoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un método de pago',
    description: 'Actualiza los datos de un método de pago existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del método de pago',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Método de pago actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMetodoPagoDto: UpdateMetodoPagoDto,
  ) {
    return this.metodosPagoService.update(id, updateMetodoPagoDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un método de pago',
    description: 'Elimina un método de pago del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del método de pago',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Método de pago eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.metodosPagoService.remove(id);
  }
}
