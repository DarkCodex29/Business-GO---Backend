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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FacturasService } from '../services/facturas.service';
import { CreateFacturaDto } from '../dto/create-factura.dto';
import { UpdateFacturaDto } from '../dto/update-factura.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('facturas')
@Roles('ADMIN', 'EMPRESA')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post(':empresaId')
  @EmpresaPermissions('facturas.crear')
  @ApiOperation({
    summary: 'Crear una nueva factura',
    description: 'Crea una nueva factura asociada a una orden de venta',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Factura creada exitosamente',
    type: CreateFacturaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la orden no está en estado válido',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden de venta, empresa o cliente no encontrado',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createFacturaDto: CreateFacturaDto,
  ) {
    return this.facturasService.create(empresaId, createFacturaDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions('facturas.ver')
  @ApiOperation({
    summary: 'Obtener todas las facturas',
    description: 'Retorna una lista de todas las facturas en el sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de facturas recuperada exitosamente',
    type: [CreateFacturaDto],
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.facturasService.findAll(empresaId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions('facturas.ver')
  @ApiOperation({
    summary: 'Obtener una factura por ID',
    description: 'Retorna los detalles de una factura específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la factura' })
  @ApiResponse({
    status: 200,
    description: 'Factura encontrada exitosamente',
    type: CreateFacturaDto,
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.facturasService.findOne(+empresaId, +id);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('facturas.editar')
  @ApiOperation({
    summary: 'Actualizar una factura',
    description: 'Actualiza los datos de una factura existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la factura' })
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
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFacturaDto: UpdateFacturaDto,
  ) {
    return this.facturasService.update(+empresaId, +id, updateFacturaDto);
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('facturas.eliminar')
  @ApiOperation({
    summary: 'Eliminar una factura',
    description: 'Elimina una factura del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la factura' })
  @ApiResponse({
    status: 200,
    description: 'Factura eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'No se puede eliminar una factura con notas de crédito o débito',
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.facturasService.remove(+empresaId, +id);
  }
}
