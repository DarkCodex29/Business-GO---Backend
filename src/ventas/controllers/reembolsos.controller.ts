import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ReembolsosService } from '../services/reembolsos.service';
import { CreateReembolsoDto } from '../dto/create-reembolso.dto';
import { UpdateReembolsoDto } from '../dto/update-reembolso.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Reembolsos')
@Controller('reembolsos')
export class ReembolsosController {
  constructor(private readonly reembolsosService: ReembolsosService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo reembolso',
    description: 'Crea un nuevo reembolso asociado a un pago existente',
  })
  @ApiResponse({ status: 201, description: 'Reembolso creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o monto excede el pago',
  })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  create(@Body() createReembolsoDto: CreateReembolsoDto) {
    return this.reembolsosService.create(createReembolsoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los reembolsos',
    description: 'Retorna una lista de todos los reembolsos en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reembolsos obtenida exitosamente',
  })
  findAll() {
    return this.reembolsosService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un reembolso específico',
    description: 'Retorna los detalles de un reembolso específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del reembolso',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Reembolso encontrado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  findOne(@Param('id') id: string) {
    return this.reembolsosService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un reembolso',
    description: 'Actualiza los datos de un reembolso existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del reembolso',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Reembolso actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o monto excede el pago',
  })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateReembolsoDto: UpdateReembolsoDto,
  ) {
    return this.reembolsosService.update(+id, updateReembolsoDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un reembolso',
    description: 'Elimina un reembolso del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del reembolso',
    type: 'number',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Reembolso eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Reembolso no encontrado' })
  remove(@Param('id') id: string) {
    return this.reembolsosService.remove(+id);
  }
}
