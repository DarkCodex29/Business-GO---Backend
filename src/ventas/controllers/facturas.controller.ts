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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';

@ApiTags('Facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.FACTURAS.CREATE] })
  @ApiOperation({
    summary: 'Crear una nueva factura',
    description: 'Crea una nueva factura asociada a una orden de venta',
  })
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
    @EmpresaId() empresaId: number,
    @Body() createFacturaDto: CreateFacturaDto,
  ) {
    return this.facturasService.create(empresaId, createFacturaDto);
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.FACTURAS.READ] })
  @ApiOperation({
    summary: 'Obtener todas las facturas',
    description: 'Retorna una lista de todas las facturas en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de facturas recuperada exitosamente',
    type: [CreateFacturaDto],
  })
  findAll(@EmpresaId() empresaId: number) {
    return this.facturasService.findAll(empresaId);
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.FACTURAS.READ] })
  @ApiOperation({
    summary: 'Obtener una factura por ID',
    description: 'Retorna los detalles de una factura específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la factura' })
  @ApiResponse({
    status: 200,
    description: 'Factura encontrada exitosamente',
    type: CreateFacturaDto,
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.facturasService.findOne(id, empresaId);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.FACTURAS.UPDATE] })
  @ApiOperation({
    summary: 'Actualizar una factura',
    description: 'Actualiza los datos de una factura existente',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFacturaDto: UpdateFacturaDto,
  ) {
    return this.facturasService.update(id, empresaId, updateFacturaDto);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.FACTURAS.DELETE] })
  @ApiOperation({
    summary: 'Eliminar una factura',
    description: 'Elimina una factura del sistema',
  })
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
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.facturasService.remove(id, empresaId);
  }

  @Post(':id/print')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.FACTURAS.PRINT] })
  @ApiOperation({
    summary: 'Imprimir una factura',
    description: 'Genera un PDF de la factura para su impresión',
  })
  @ApiParam({ name: 'id', description: 'ID de la factura' })
  @ApiResponse({
    status: 200,
    description: 'PDF de factura generado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  print(@EmpresaId() empresaId: number, @Param('id', ParseIntPipe) id: number) {
    return this.facturasService.findOne(id, empresaId);
  }
}
