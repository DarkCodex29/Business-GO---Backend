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
import { OrdenesVentaService } from '../services/ordenes-venta.service';
import { CreateOrdenVentaDto } from '../dto/create-orden-venta.dto';
import { UpdateOrdenVentaDto } from '../dto/update-orden-venta.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Órdenes de Venta')
@Controller('ordenes-venta')
export class OrdenesVentaController {
  constructor(private readonly ordenesVentaService: OrdenesVentaService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva orden de venta',
    description: 'Crea una nueva orden de venta con sus items y detalles',
  })
  @ApiResponse({
    status: 201,
    description: 'Orden de venta creada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o productos no disponibles',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa, cliente o producto no encontrado',
  })
  create(@Body() createOrdenVentaDto: CreateOrdenVentaDto) {
    return this.ordenesVentaService.create(createOrdenVentaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las órdenes de venta',
    description:
      'Retorna una lista de todas las órdenes de venta en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes de venta recuperada exitosamente',
    type: [CreateOrdenVentaDto],
  })
  findAll() {
    return this.ordenesVentaService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una orden de venta por ID',
    description: 'Retorna los detalles de una orden de venta específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de venta',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta encontrada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesVentaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una orden de venta',
    description: 'Actualiza los datos de una orden de venta existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de venta',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta actualizada exitosamente',
    type: UpdateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una orden de venta facturada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrdenVentaDto: UpdateOrdenVentaDto,
  ) {
    return this.ordenesVentaService.update(id, updateOrdenVentaDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una orden de venta',
    description: 'Elimina una orden de venta del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de venta',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Orden de venta eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una orden de venta facturada',
  })
  @ApiResponse({ status: 404, description: 'Orden de venta no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesVentaService.remove(id);
  }
}
