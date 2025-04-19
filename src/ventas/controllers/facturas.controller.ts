import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FacturasService } from '../services/facturas.service';
import { CreateFacturaDto } from '../dto/create-factura.dto';
import { UpdateFacturaDto } from '../dto/update-factura.dto';
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

@ApiTags('Facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear una nueva factura',
    description:
      'Crea una nueva factura asociada a una orden de venta existente',
  })
  @ApiResponse({
    status: 201,
    description: 'Factura creada exitosamente',
    type: CreateFacturaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la orden de venta no está completada',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa, cliente, orden de venta o producto no encontrado',
  })
  create(@Body() createFacturaDto: CreateFacturaDto) {
    return this.facturasService.create(createFacturaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las facturas',
    description: 'Retorna una lista de todas las facturas en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de facturas recuperada exitosamente',
    type: [CreateFacturaDto],
  })
  findAll() {
    return this.facturasService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una factura por ID',
    description: 'Retorna los detalles de una factura específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la factura',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Factura encontrada exitosamente',
    type: CreateFacturaDto,
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facturasService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Actualizar una factura',
    description: 'Actualiza los datos de una factura existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la factura',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Factura actualizada exitosamente',
    type: UpdateFacturaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una factura pagada o anulada',
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFacturaDto: UpdateFacturaDto,
  ) {
    return this.facturasService.update(id, updateFacturaDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Eliminar una factura',
    description: 'Elimina una factura del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la factura',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Factura eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una factura pagada',
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.facturasService.remove(id);
  }
}
