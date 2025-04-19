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
import { DireccionesService } from '../services/direcciones.service';
import { CreateClienteDireccionDto } from '../dto/create-direccion.dto';
import { UpdateClienteDireccionDto } from '../dto/update-direccion.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Direcciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(CreateClienteDireccionDto, UpdateClienteDireccionDto)
@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({ summary: 'Crear dirección' })
  @ApiResponse({ status: 201, description: 'Dirección creada exitosamente' })
  create(@Body() createDireccionDto: CreateClienteDireccionDto) {
    return this.direccionesService.create(createDireccionDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todas las direcciones' })
  findAll() {
    return this.direccionesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({ summary: 'Obtener una dirección por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.direccionesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({ summary: 'Actualizar una dirección' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDireccionDto: UpdateClienteDireccionDto,
  ) {
    return this.direccionesService.update(id, updateDireccionDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA', 'CLIENTE')
  @ApiOperation({ summary: 'Eliminar una dirección' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.direccionesService.remove(id);
  }
}
