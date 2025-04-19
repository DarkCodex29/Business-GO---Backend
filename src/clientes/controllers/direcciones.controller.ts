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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DireccionesService } from '../services/direcciones.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Direcciones')
@ApiBearerAuth()
@Controller('direcciones/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles('ADMIN', 'EMPRESA')
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Post()
  @EmpresaPermissions('direcciones.crear')
  @ApiOperation({ summary: 'Crear una nueva dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Dirección creada exitosamente',
  })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createDireccionDto: CreateClienteDireccionDto,
  ) {
    return this.direccionesService.create(+empresaId, createDireccionDto);
  }

  @Get()
  @EmpresaPermissions('direcciones.ver')
  @ApiOperation({ summary: 'Obtener todas las direcciones de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de direcciones obtenida exitosamente',
  })
  findAll(@Param('empresaId') empresaId: string) {
    return this.direccionesService.findAll(+empresaId);
  }

  @Get(':id')
  @EmpresaPermissions('direcciones.ver')
  @ApiOperation({ summary: 'Obtener una dirección específica' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección encontrada exitosamente',
  })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.direccionesService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions('direcciones.editar')
  @ApiOperation({ summary: 'Actualizar una dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección actualizada exitosamente',
  })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    return this.direccionesService.update(+id, +empresaId, updateDireccionDto);
  }

  @Delete(':id')
  @EmpresaPermissions('direcciones.eliminar')
  @ApiOperation({ summary: 'Eliminar una dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección eliminada exitosamente',
  })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.direccionesService.remove(+id, +empresaId);
  }
}
