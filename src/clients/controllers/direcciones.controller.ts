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
import { DireccionesService } from '../services/direcciones.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
} from '@nestjs/swagger';

@ApiTags('Direcciones')
@ApiExtraModels(CreateClienteDireccionDto, UpdateClienteDireccionDto)
@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear dirección' })
  @ApiResponse({ status: 201, description: 'Dirección creada exitosamente' })
  create(@Body() createDireccionDto: CreateClienteDireccionDto) {
    return this.direccionesService.create(createDireccionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las direcciones' })
  findAll() {
    return this.direccionesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una dirección por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.direccionesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una dirección' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    return this.direccionesService.update(id, updateDireccionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una dirección' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.direccionesService.remove(id);
  }
}
