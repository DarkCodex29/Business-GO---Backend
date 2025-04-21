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
import { PagosService } from '../services/pagos.service';
import { CreatePagoDto } from '../dto/create-pago.dto';
import { UpdatePagoDto } from '../dto/update-pago.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear un nuevo pago',
    description: 'Crea un nuevo pago para una compra',
  })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Historial de compra o método de pago no encontrado',
  })
  create(@Body() createPagoDto: CreatePagoDto) {
    return this.pagosService.create(createPagoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los pagos',
    description: 'Retorna una lista de todos los pagos',
  })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  findAll() {
    return this.pagosService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un pago',
    description: 'Retorna los detalles de un pago específico',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Detalles del pago' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Actualizar un pago',
    description: 'Actualiza los datos de un pago existente',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Pago actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePagoDto: UpdatePagoDto,
  ) {
    return this.pagosService.update(id, updatePagoDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Eliminar un pago',
    description: 'Elimina un pago del sistema',
  })
  @ApiParam({ name: 'id', description: 'ID del pago', type: 'number' })
  @ApiResponse({ status: 200, description: 'Pago eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.remove(id);
  }
}
