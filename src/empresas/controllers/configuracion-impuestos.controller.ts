import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ConfiguracionImpuestosService } from '../services/configuracion-impuestos.service';
import { CreateConfiguracionImpuestosDto } from '../dto/create-configuracion-impuestos.dto';
import { UpdateConfiguracionImpuestosDto } from '../dto/update-configuracion-impuestos.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Configuración de Impuestos')
@Controller('configuracion-impuestos')
export class ConfiguracionImpuestosController {
  constructor(
    private readonly configuracionImpuestosService: ConfiguracionImpuestosService,
  ) {}

  @Post(':empresaId')
  @ApiOperation({
    summary: 'Crear configuración de impuestos',
    description: 'Crea una nueva configuración de impuestos para una empresa',
  })
  @ApiParam({
    name: 'empresaId',
    description: 'ID de la empresa',
    type: 'number',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuración de impuestos creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o empresa no encontrada',
  })
  create(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() createConfiguracionImpuestosDto: CreateConfiguracionImpuestosDto,
  ) {
    return this.configuracionImpuestosService.create(
      empresaId,
      createConfiguracionImpuestosDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las configuraciones',
    description: 'Retorna todas las configuraciones de impuestos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de configuraciones de impuestos',
  })
  findAll() {
    return this.configuracionImpuestosService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una configuración',
    description: 'Retorna una configuración de impuestos específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la configuración de impuestos',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de impuestos encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración de impuestos no encontrada',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.configuracionImpuestosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar configuración',
    description: 'Actualiza una configuración de impuestos existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la configuración de impuestos',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de impuestos actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración de impuestos no encontrada',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConfiguracionImpuestosDto: UpdateConfiguracionImpuestosDto,
  ) {
    return this.configuracionImpuestosService.update(
      id,
      updateConfiguracionImpuestosDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar configuración',
    description: 'Elimina una configuración de impuestos',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la configuración de impuestos',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de impuestos eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración de impuestos no encontrada',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.configuracionImpuestosService.remove(id);
  }
}
