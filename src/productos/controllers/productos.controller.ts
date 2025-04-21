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
import { ProductosService } from '../services/productos.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
@Controller('productos/:empresaId')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Crear un nuevo producto o servicio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Param('empresaId') empresaId: string,
    @Body() createProductoDto: CreateProductoDto,
  ) {
    return this.productosService.create(+empresaId, createProductoDto);
  }

  @Get()
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({
    summary: 'Obtener todos los productos y servicios de una empresa',
  })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  findAll(@Param('empresaId') empresaId: string) {
    return this.productosService.findAll(+empresaId);
  }

  @Get(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.READ] })
  @ApiOperation({ summary: 'Obtener un producto o servicio por ID' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.productosService.findOne(+id, +empresaId);
  }

  @Patch(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.WRITE] })
  @ApiOperation({ summary: 'Actualizar un producto o servicio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  update(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(+id, +empresaId, updateProductoDto);
  }

  @Delete(':id')
  @EmpresaPermissions({ permissions: [PERMISSIONS.PRODUCTOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar un producto o servicio' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  remove(@Param('empresaId') empresaId: string, @Param('id') id: string) {
    return this.productosService.remove(+id, +empresaId);
  }
}
