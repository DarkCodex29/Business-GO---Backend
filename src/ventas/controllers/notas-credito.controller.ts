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
import { NotasCreditoService } from '../services/notas-credito.service';
import { CreateNotaCreditoDto } from '../dto/create-nota-credito.dto';
import { UpdateNotaCreditoDto } from '../dto/update-nota-credito.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Notas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notas-credito')
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Crear una nueva nota de crédito',
    description:
      'Crea una nueva nota de crédito asociada a una factura existente',
  })
  @ApiResponse({
    status: 201,
    description: 'Nota de crédito creada exitosamente',
    type: CreateNotaCreditoDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, factura anulada o cantidades exceden lo facturado',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa, cliente, factura o producto no encontrado',
  })
  create(@Body() createNotaCreditoDto: CreateNotaCreditoDto) {
    return this.notasCreditoService.create(createNotaCreditoDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener todas las notas de crédito',
    description:
      'Retorna una lista de todas las notas de crédito en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas de crédito recuperada exitosamente',
    type: [CreateNotaCreditoDto],
  })
  findAll() {
    return this.notasCreditoService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Obtener una nota de crédito por ID',
    description: 'Retorna los detalles de una nota de crédito específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de crédito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito encontrada exitosamente',
    type: CreateNotaCreditoDto,
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notasCreditoService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Actualizar una nota de crédito',
    description: 'Actualiza los datos de una nota de crédito existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de crédito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito actualizada exitosamente',
    type: UpdateNotaCreditoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede modificar una nota de crédito aplicada o anulada',
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotaCreditoDto: UpdateNotaCreditoDto,
  ) {
    return this.notasCreditoService.update(id, updateNotaCreditoDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({
    summary: 'Eliminar una nota de crédito',
    description: 'Elimina una nota de crédito del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la nota de crédito',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Nota de crédito eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una nota de crédito aplicada',
  })
  @ApiResponse({ status: 404, description: 'Nota de crédito no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notasCreditoService.remove(id);
  }
}
