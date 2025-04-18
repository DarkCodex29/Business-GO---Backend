import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmpresasService } from '../services/empresas.service';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../dto/update-empresa.dto';
import { CreateDireccionDto } from '../dto/create-direccion.dto';
import { UpdateDireccionDto } from '../dto/update-direccion.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Empresas')
@Controller('empresas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva empresa' })
  @ApiResponse({
    status: 201,
    description: 'La empresa ha sido creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresasService.create(createEmpresaDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener todas las empresas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas obtenida exitosamente',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return this.empresasService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener una empresa por ID' })
  @ApiResponse({
    status: 200,
    description: 'Empresa encontrada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
  ) {
    return this.empresasService.update(id, updateEmpresaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.remove(id);
  }

  // Endpoints para gestionar direcciones
  @Post(':id/direcciones')
  @ApiOperation({ summary: 'Crear una dirección para una empresa' })
  @ApiResponse({
    status: 201,
    description: 'Dirección creada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  createDireccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDireccionDto: CreateDireccionDto,
  ) {
    createDireccionDto.id_empresa = id;
    return this.empresasService.createDireccion(createDireccionDto);
  }

  @Patch(':id/direcciones/:direccionId')
  @ApiOperation({ summary: 'Actualizar una dirección de una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Dirección actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  updateDireccion(
    @Param('id') id: number,
    @Param('direccionId') direccionId: number,
    @Body() updateDireccionDto: UpdateDireccionDto,
  ) {
    return this.empresasService.updateDireccion(
      id,
      direccionId,
      updateDireccionDto,
    );
  }

  @Delete(':id/direcciones/:direccionId')
  @ApiOperation({ summary: 'Eliminar una dirección de una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Dirección eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  removeDireccion(
    @Param('id') id: number,
    @Param('direccionId') direccionId: number,
  ) {
    return this.empresasService.removeDireccion(id, direccionId);
  }

  // Endpoints para gestionar la relación usuario-empresa
  @Post(':id/usuarios/:usuarioId')
  @ApiOperation({ summary: 'Asignar un usuario a una empresa' })
  @ApiResponse({
    status: 201,
    description: 'Usuario asignado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Empresa o usuario no encontrado' })
  asignarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body('esDueno') esDueno: boolean = false,
  ) {
    return this.empresasService.asignarUsuario(id, usuarioId, esDueno);
  }

  @Delete(':id/usuarios/:usuarioId')
  @ApiOperation({ summary: 'Remover un usuario de una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Usuario removido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Relación usuario-empresa no encontrada',
  })
  removerUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.empresasService.removerUsuario(id, usuarioId);
  }
}
