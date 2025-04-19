import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FidelizacionService } from '../services/fidelizacion.service';
import { CreateFidelizacionDto } from '../dto/create-fidelizacion.dto';
import { UpdatePuntosFidelizacionDto } from '../dto/update-puntos-fidelizacion.dto';
import { EmpresaPermissionGuard } from '../../common/guards/empresa-permission.guard';
import { EmpresaPermissions } from '../../common/decorators/empresa-permissions.decorator';

@ApiTags('Fidelización')
@ApiBearerAuth()
@Controller('fidelizacion/:empresaId')
@UseGuards(JwtAuthGuard, RolesGuard, EmpresaPermissionGuard)
@Roles('ADMIN', 'EMPRESA')
export class FidelizacionController {
  constructor(private readonly fidelizacionService: FidelizacionService) {}

  @Post()
  @ApiOperation({ summary: 'Crear fidelización para un cliente' })
  @ApiResponse({ status: 201, description: 'Fidelización creada exitosamente' })
  @EmpresaPermissions('fidelizacion.crear')
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createFidelizacionDto: CreateFidelizacionDto,
  ) {
    return this.fidelizacionService.createFidelizacion(
      empresaId,
      createFidelizacionDto,
    );
  }

  @Get('cliente/:clienteId')
  @ApiOperation({ summary: 'Obtener fidelización de un cliente' })
  @ApiResponse({ status: 200, description: 'Fidelización encontrada' })
  @EmpresaPermissions('fidelizacion.ver')
  getFidelizacionCliente(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('clienteId', ParseIntPipe) clienteId: number,
  ) {
    return this.fidelizacionService.getFidelizacionCliente(
      empresaId,
      clienteId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las fidelizaciones de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de fidelizaciones' })
  @EmpresaPermissions('fidelizacion.ver')
  getFidelizacionEmpresa(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.fidelizacionService.getFidelizacionEmpresa(empresaId);
  }

  @Patch('cliente/:clienteId/puntos')
  @ApiOperation({ summary: 'Actualizar puntos de fidelización de un cliente' })
  @ApiResponse({ status: 200, description: 'Puntos actualizados exitosamente' })
  @EmpresaPermissions('fidelizacion.editar')
  updatePuntosFidelizacion(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() updatePuntosFidelizacionDto: UpdatePuntosFidelizacionDto,
  ) {
    return this.fidelizacionService.updatePuntosFidelizacion(
      empresaId,
      clienteId,
      updatePuntosFidelizacionDto,
    );
  }
}
