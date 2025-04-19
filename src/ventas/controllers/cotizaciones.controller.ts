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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CotizacionesService } from '../services/cotizaciones.service';
import { CreateCotizacionDto } from '../dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from '../dto/update-cotizacion.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear una nueva cotización',
    description: 'Crea una nueva cotización con sus items y detalles',
  })
  @ApiResponse({
    status: 201,
    description: 'Cotización creada exitosamente',
    type: CreateCotizacionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o productos no disponibles',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa, cliente o producto no encontrado',
  })
  create(@Body() createCotizacionDto: CreateCotizacionDto) {
    return this.cotizacionesService.create(createCotizacionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las cotizaciones',
    description: 'Retorna una lista de todas las cotizaciones en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cotizaciones recuperada exitosamente',
    type: [CreateCotizacionDto],
  })
  findAll() {
    return this.cotizacionesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una cotización por ID',
    description: 'Retorna los detalles de una cotización específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cotización',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Cotización encontrada exitosamente',
    type: CreateCotizacionDto,
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cotizacionesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Actualizar una cotización',
    description: 'Actualiza los datos de una cotización existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cotización',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Cotización actualizada exitosamente',
    type: UpdateCotizacionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una cotización convertida',
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
  ) {
    return this.cotizacionesService.update(id, updateCotizacionDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Eliminar una cotización',
    description: 'Elimina una cotización del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cotización',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Cotización eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una cotización convertida',
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cotizacionesService.remove(id);
  }
}
