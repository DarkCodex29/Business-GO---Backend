import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PreciosService } from '../services/precios.service';
import { CreatePrecioDto } from '../dto/create-precio.dto';
import { UpdatePrecioDto } from '../dto/update-precio.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Precios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear un nuevo precio' })
  @ApiResponse({ status: 201, description: 'Precio creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  create(@Body() createPrecioDto: CreatePrecioDto) {
    return this.preciosService.create(createPrecioDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los precios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de precios obtenida exitosamente',
  })
  findAll() {
    return this.preciosService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener un precio por ID' })
  @ApiResponse({ status: 200, description: 'Precio encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  findOne(@Param('id') id: string) {
    return this.preciosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar un precio' })
  @ApiResponse({ status: 200, description: 'Precio actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  update(@Param('id') id: string, @Body() updatePrecioDto: UpdatePrecioDto) {
    return this.preciosService.update(+id, updatePrecioDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un precio' })
  @ApiResponse({ status: 200, description: 'Precio eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Precio no encontrado' })
  remove(@Param('id') id: string) {
    return this.preciosService.remove(+id);
  }
}
