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
import { CategoriasService } from '../services/categorias.service';
import { CreateCategoriaDto } from '../dto/create-categoria.dto';
import { UpdateCategoriaDto } from '../dto/update-categoria.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
@Controller('categorias/:empresaId')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createCategoriaDto: CreateCategoriaDto,
  ) {
    return this.categoriasService.create(+empresaId, createCategoriaDto);
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener todas las categorías' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.categoriasService.findAll(+empresaId);
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener una categoría por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.categoriasService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar una categoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(+id, +empresaId, updateCategoriaDto);
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar una categoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría eliminada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.categoriasService.remove(+id, +empresaId);
  }
}
