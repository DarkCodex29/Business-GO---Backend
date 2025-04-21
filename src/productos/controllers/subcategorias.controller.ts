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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubcategoriasService } from '../services/subcategorias.service';
import { CreateSubcategoriaDto } from '../dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from '../dto/update-subcategoria.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Subcategorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
@Controller('subcategorias/:empresaId')
export class SubcategoriasController {
  constructor(private readonly subcategoriasService: SubcategoriasService) {}

  @Post(':categoriaId')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Crear una nueva subcategoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({
    name: 'categoriaId',
    description: 'ID de la categoría',
    type: 'number',
  })
  create(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Body() createSubcategoriaDto: CreateSubcategoriaDto,
  ) {
    return this.subcategoriasService.create(
      +empresaId,
      +categoriaId,
      createSubcategoriaDto,
    );
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener todas las subcategorías de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de subcategorías obtenida exitosamente',
  })
  findAll(@Param('empresaId') empresaId: string) {
    return this.subcategoriasService.findAll(+empresaId);
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener una subcategoría por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID de la subcategoría' })
  @ApiResponse({ status: 200, description: 'Subcategoría encontrada' })
  @ApiResponse({ status: 404, description: 'Subcategoría no encontrada' })
  findOne(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Param('id') id: string,
  ) {
    return this.subcategoriasService.findOne(+id, +categoriaId, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar una subcategoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'categoriaId', description: 'ID de la categoría' })
  @ApiParam({ name: 'id', description: 'ID de la subcategoría' })
  @ApiResponse({ status: 200, description: 'Subcategoría actualizada' })
  @ApiResponse({ status: 404, description: 'Subcategoría no encontrada' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Param('id') id: string,
    @Body() updateSubcategoriaDto: UpdateSubcategoriaDto,
  ) {
    return this.subcategoriasService.update(
      +id,
      +categoriaId,
      +empresaId,
      updateSubcategoriaDto,
    );
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar una subcategoría' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'categoriaId', description: 'ID de la categoría' })
  @ApiParam({ name: 'id', description: 'ID de la subcategoría' })
  @ApiResponse({ status: 200, description: 'Subcategoría eliminada' })
  @ApiResponse({ status: 404, description: 'Subcategoría no encontrada' })
  remove(
    @Param('empresaId') empresaId: string,
    @Param('categoriaId') categoriaId: string,
    @Param('id') id: string,
  ) {
    return this.subcategoriasService.remove(+id, +categoriaId, +empresaId);
  }
}
