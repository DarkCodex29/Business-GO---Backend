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
import { ConfiguracionImpuestosService } from '../services/configuracion-impuestos.service';
import { CreateConfiguracionImpuestosDto } from '../dto/create-configuracion-impuestos.dto';
import { UpdateConfiguracionImpuestosDto } from '../dto/update-configuracion-impuestos.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Configuración de Impuestos')
@Controller('configuracion-impuestos')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth()
export class ConfiguracionImpuestosController {
  constructor(
    private readonly configuracionImpuestosService: ConfiguracionImpuestosService,
  ) {}

  @Post(':empresaId')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS.WRITE],
  })
  @ApiOperation({
    summary: 'Crear configuración de impuestos',
    description: 'Crea una nueva configuración de impuestos para una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuración de impuestos creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o empresa no encontrada',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createConfiguracionImpuestosDto: CreateConfiguracionImpuestosDto,
  ) {
    return this.configuracionImpuestosService.create(
      empresaId,
      createConfiguracionImpuestosDto,
    );
  }

  @Get()
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS.READ],
  })
  @ApiOperation({
    summary: 'Obtener todas las configuraciones',
    description: 'Retorna todas las configuraciones de impuestos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de configuraciones de impuestos',
  })
  findAll() {
    return this.configuracionImpuestosService.findAll();
  }

  @Get(':id')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS.READ],
  })
  @ApiOperation({
    summary: 'Obtener una configuración',
    description: 'Retorna una configuración de impuestos específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la configuración de impuestos',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de impuestos encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración de impuestos no encontrada',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.configuracionImpuestosService.findOne(id);
  }

  @Patch(':id')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS.WRITE],
  })
  @ApiOperation({
    summary: 'Actualizar configuración',
    description: 'Actualiza una configuración de impuestos existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la configuración de impuestos',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de impuestos actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración de impuestos no encontrada',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConfiguracionImpuestosDto: UpdateConfiguracionImpuestosDto,
  ) {
    return this.configuracionImpuestosService.update(
      id,
      updateConfiguracionImpuestosDto,
    );
  }

  @Delete(':id')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.IMPUESTOS.DELETE],
  })
  @ApiOperation({
    summary: 'Eliminar configuración',
    description: 'Elimina una configuración de impuestos',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la configuración de impuestos',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de impuestos eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración de impuestos no encontrada',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.configuracionImpuestosService.remove(id);
  }
}
