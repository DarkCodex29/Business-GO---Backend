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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AtributosService } from '../services/atributos.service';
import { CreateAtributoDto } from '../dto/create-atributo.dto';
import { UpdateAtributoDto } from '../dto/update-atributo.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Atributos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
@Controller('atributos/:empresaId')
export class AtributosController {
  constructor(private readonly atributosService: AtributosService) {}

  @Post()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Crear un nuevo atributo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Atributo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createAtributoDto: CreateAtributoDto,
  ) {
    return this.atributosService.create(+empresaId, createAtributoDto);
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener todos los atributos de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de atributos' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.atributosService.findAll(+empresaId);
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener un atributo por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del atributo' })
  @ApiResponse({ status: 200, description: 'Atributo encontrado' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.atributosService.findOne(+id, +empresaId);
  }

  @Get('producto/:id_producto')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener todos los atributos de un producto' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id_producto', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Lista de atributos del producto' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findByProducto(
    @Param('empresaId') empresaId: string,
    @Param('id_producto') id_producto: string,
  ) {
    return this.atributosService.findByProducto(+id_producto, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar un atributo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del atributo' })
  @ApiResponse({ status: 200, description: 'Atributo actualizado' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateAtributoDto: UpdateAtributoDto,
  ) {
    return this.atributosService.update(+id, +empresaId, updateAtributoDto);
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar un atributo' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del atributo' })
  @ApiResponse({ status: 200, description: 'Atributo eliminado' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.atributosService.remove(+id, +empresaId);
  }
}
