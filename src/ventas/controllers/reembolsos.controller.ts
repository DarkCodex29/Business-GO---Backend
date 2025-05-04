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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { ROLES, ROLES_EMPRESA } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Reembolsos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Controller('empresas/:empresaId/reembolsos')
export class ReembolsosController {
  constructor(private readonly reembolsosService: ReembolsosService) {}

  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.REEMBOLSOS.CREATE] })
  @ApiOperation({ summary: 'Crear un nuevo reembolso' })
  @ApiResponse({ status: 201, description: 'Reembolso creado exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para crear reembolsos',
  })
  create(
    @EmpresaId() empresaId: number,
    @Body() createReembolsoDto: CreateReembolsoDto,
  ) {
    return this.reembolsosService.create(empresaId, createReembolsoDto);
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.REEMBOLSOS.READ] })
  @ApiOperation({ summary: 'Obtener todos los reembolsos de una empresa' })
  @ApiResponse({ status: 200, description: 'Lista de reembolsos' })
  findAll(@EmpresaId() empresaId: number) {
    return this.reembolsosService.findAll(empresaId);
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
    ROLES_EMPRESA.VENDEDOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.REEMBOLSOS.READ] })
  @ApiOperation({ summary: 'Obtener un reembolso específico' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({ status: 200, description: 'Reembolso encontrado' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  findOne(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.findOne(empresaId, id);
  }

  @Patch(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.REEMBOLSOS.UPDATE] })
  @ApiOperation({ summary: 'Actualizar un reembolso' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({
    status: 200,
    description: 'Reembolso actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  update(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReembolsoDto: UpdateReembolsoDto,
  ) {
    return this.reembolsosService.update(empresaId, id, updateReembolsoDto);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES_EMPRESA.ADMINISTRADOR)
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.REEMBOLSOS.DELETE] })
  @ApiOperation({ summary: 'Eliminar un reembolso' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({ status: 200, description: 'Reembolso eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  remove(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.remove(empresaId, id);
  }

  @Post(':id/approve')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES_EMPRESA.ADMINISTRADOR,
    ROLES_EMPRESA.CONTADOR,
  )
  @EmpresaPermissions({ permissions: [PERMISSIONS.VENTAS.REEMBOLSOS.APPROVE] })
  @ApiOperation({ summary: 'Aprobar un reembolso' })
  @ApiParam({ name: 'id', description: 'ID del reembolso' })
  @ApiResponse({ status: 200, description: 'Reembolso aprobado exitosamente' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  approve(
    @EmpresaId() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reembolsosService.approve(empresaId, id);
  }
}
