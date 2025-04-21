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
import { ConfiguracionRegionalService } from '../services/configuracion-regional.service';
import { CreateConfiguracionRegionalDto } from '../dto/create-configuracion-regional.dto';
import { UpdateConfiguracionRegionalDto } from '../dto/update-configuracion-regional.dto';
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

@ApiTags('Configuración Regional')
@Controller('empresas/:empresaId/configuracion-regional')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth()
export class ConfiguracionRegionalController {
  constructor(
    private readonly configuracionRegionalService: ConfiguracionRegionalService,
  ) {}

  @Post()
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL.WRITE],
  })
  @ApiOperation({
    summary: 'Crear configuración regional',
    description: 'Crea una nueva configuración regional para una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuración regional creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o empresa ya tiene configuración',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createConfiguracionRegionalDto: CreateConfiguracionRegionalDto,
  ) {
    return this.configuracionRegionalService.create(
      empresaId,
      createConfiguracionRegionalDto,
    );
  }

  @Get()
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL.READ],
  })
  @ApiOperation({
    summary: 'Obtener todas las configuraciones regionales',
    description: 'Retorna una lista de todas las configuraciones regionales',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de configuraciones regionales',
  })
  findAll() {
    return this.configuracionRegionalService.findAll();
  }

  @Get(':id')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL.READ],
  })
  @ApiOperation({
    summary: 'Obtener configuración regional',
    description: 'Retorna la configuración regional de una empresa específica',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración regional encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración regional no encontrada',
  })
  findOne(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.configuracionRegionalService.findOne(empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL.WRITE],
  })
  @ApiOperation({
    summary: 'Actualizar configuración regional',
    description: 'Actualiza la configuración regional de una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración regional actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración regional no encontrada',
  })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() updateConfiguracionRegionalDto: UpdateConfiguracionRegionalDto,
  ) {
    return this.configuracionRegionalService.update(
      empresaId,
      updateConfiguracionRegionalDto,
    );
  }

  @Delete(':id')
  @EmpresaPermissions({
    permissions: [PERMISSIONS.EMPRESA.CONFIGURACION.REGIONAL.DELETE],
  })
  @ApiOperation({
    summary: 'Eliminar configuración regional',
    description: 'Elimina la configuración regional de una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración regional eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración regional no encontrada',
  })
  remove(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.configuracionRegionalService.remove(empresaId);
  }
}
