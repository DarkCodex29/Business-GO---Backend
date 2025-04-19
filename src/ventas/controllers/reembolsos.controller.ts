import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReembolsosService } from '../services/reembolsos.service';
import { CreateReembolsoDto } from '../dto/create-reembolso.dto';
import { UpdateReembolsoDto } from '../dto/update-reembolso.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Reembolsos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reembolsos')
@Roles('ADMIN', 'EMPRESA')
export class ReembolsosController {
  constructor(private readonly reembolsosService: ReembolsosService) {}

  @Post(':empresaId')
  @EmpresaPermissions('reembolsos.crear')
  @ApiOperation({ summary: 'Crear un nuevo reembolso' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Reembolso creado exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para crear reembolsos',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createReembolsoDto: CreateReembolsoDto,
  ) {
    return this.reembolsosService.create(empresaId, createReembolsoDto);
  }

  @Get(':empresaId')
  @EmpresaPermissions('reembolsos.ver')
  @ApiOperation({ summary: 'Obtener todos los reembolsos de una empresa' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de reembolsos' })
  findAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.reembolsosService.findAll(empresaId);
  }

  @Get(':empresaId/:id')
  @EmpresaPermissions('reembolsos.ver')
  @ApiOperation({ summary: 'Obtener un reembolso específico' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({ status: 200, description: 'Reembolso encontrado' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  findOne(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.findOne(empresaId, id);
  }

  @Patch(':empresaId/:id')
  @EmpresaPermissions('reembolsos.editar')
  @ApiOperation({ summary: 'Actualizar un reembolso' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({
    status: 200,
    description: 'Reembolso actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  update(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReembolsoDto: UpdateReembolsoDto,
  ) {
    return this.reembolsosService.update(empresaId, id, updateReembolsoDto);
  }

  @Delete(':empresaId/:id')
  @EmpresaPermissions('reembolsos.eliminar')
  @ApiOperation({ summary: 'Eliminar un reembolso' })
  @ApiParam({ name: 'empresaId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({ status: 200, description: 'Reembolso eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  remove(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.remove(empresaId, id);
  }
}
