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
import { OrdenesVentaService } from '../services/ordenes-venta.service';
import { CreateOrdenVentaDto } from '../dto/create-orden-venta.dto';
import { UpdateOrdenVentaDto } from '../dto/update-orden-venta.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Órdenes de Venta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes-venta')
export class OrdenesVentaController {
  constructor(private readonly ordenesVentaService: OrdenesVentaService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear una nueva orden de venta',
    description: 'Crea una nueva orden de venta en el sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Orden de venta creada exitosamente',
    type: CreateOrdenVentaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la cotización no está en estado pendiente',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa, cliente, cotización o producto no encontrado',
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
    summary: 'Obtener una orden de venta',
    description: 'Retorna una orden de venta específica',
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
  findOne(@Param('id') id: string) {
    return this.ordenesVentaService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Actualizar una orden de venta',
    description: 'Actualiza una orden de venta existente',
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
    @Param('id') id: string,
    @Body() updateOrdenVentaDto: UpdateOrdenVentaDto,
  ) {
    return this.ordenesVentaService.update(+id, updateOrdenVentaDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
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
  remove(@Param('id') id: string) {
    return this.ordenesVentaService.remove(+id);
  }
}
