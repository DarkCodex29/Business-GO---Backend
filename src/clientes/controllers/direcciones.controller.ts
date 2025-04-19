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
import { DireccionesService } from '../services/direcciones.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Direcciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@ApiExtraModels(CreateClienteDireccionDto, UpdateClienteDireccionDto)
@Controller('empresas/:empresaId/direcciones')
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('direcciones.crear')
  @ApiOperation({ summary: 'Crear dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Dirección creada exitosamente' })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createDireccionDto: CreateClienteDireccionDto,
  ) {
    return this.direccionesService.create(empresaId, createDireccionDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('direcciones.ver')
  @ApiOperation({ summary: 'Obtener todas las direcciones de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de direcciones obtenida exitosamente',
  })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.direccionesService.findAll(empresaId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('direcciones.ver')
  @ApiOperation({ summary: 'Obtener una dirección por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección encontrada exitosamente',
  })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.direccionesService.findOne(empresaId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('direcciones.editar')
  @ApiOperation({ summary: 'Actualizar una dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({
    status: 200,
    description: 'Dirección actualizada exitosamente',
  })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    return this.direccionesService.update(empresaId, id, updateDireccionDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @EmpresaPermissions('direcciones.eliminar')
  @ApiOperation({ summary: 'Eliminar una dirección' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({ status: 200, description: 'Dirección eliminada exitosamente' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.direccionesService.remove(empresaId, id);
  }
}
