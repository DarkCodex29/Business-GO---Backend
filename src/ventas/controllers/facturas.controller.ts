import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
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
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('facturas.crear')
  @ApiOperation({
    summary: 'Crear una nueva factura',
    description: 'Crea una nueva factura a partir de una orden de venta',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Factura creada exitosamente',
    type: CreateFacturaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La orden de venta ya está facturada',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa u orden de venta no encontrada',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createFacturaDto: CreateFacturaDto,
  ) {
    return this.facturasService.create(empresaId, createFacturaDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('facturas.ver')
  @ApiOperation({
    summary: 'Obtener todas las facturas',
    description: 'Retorna una lista de todas las facturas de la empresa',
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

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('facturas.ver')
  @ApiOperation({
    summary: 'Obtener una factura',
    description: 'Retorna una factura específica',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
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
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.facturasService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('facturas.editar')
  @ApiOperation({
    summary: 'Actualizar una factura',
    description: 'Actualiza una factura existente',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
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
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFacturaDto: UpdateFacturaDto,
  ) {
    return this.facturasService.update(id, empresaId, updateFacturaDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('facturas.eliminar')
  @ApiOperation({
    summary: 'Eliminar una factura',
    description: 'Elimina una factura del sistema',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
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
    description:
      'No se puede eliminar una factura con notas de crédito o débito asociadas',
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.facturasService.remove(id, empresaId);
  }
}
