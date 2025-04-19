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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PreciosService } from '../services/precios.service';
import { CreatePrecioDto } from '../dto/create-precio.dto';
import { UpdatePrecioDto } from '../dto/update-precio.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Precios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('precios.crear')
  @ApiOperation({ summary: 'Crear un nuevo precio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Precio creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createPrecioDto: CreatePrecioDto,
  ) {
    return this.preciosService.create(+empresaId, createPrecioDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('precios.ver')
  @ApiOperation({ summary: 'Obtener todos los precios de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de precios' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.preciosService.findAll(+empresaId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('precios.ver')
  @ApiOperation({ summary: 'Obtener un precio por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del precio' })
  @ApiResponse({ status: 200, description: 'Precio encontrado' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.preciosService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('precios.editar')
  @ApiOperation({ summary: 'Actualizar un precio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del precio' })
  @ApiResponse({ status: 200, description: 'Precio actualizado' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updatePrecioDto: UpdatePrecioDto,
  ) {
    return this.preciosService.update(+id, +empresaId, updatePrecioDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('precios.eliminar')
  @ApiOperation({ summary: 'Eliminar un precio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del precio' })
  @ApiResponse({ status: 200, description: 'Precio eliminado' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.preciosService.remove(+id, +empresaId);
  }
}
