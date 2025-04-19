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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AtributosService } from '../services/atributos.service';
import { CreateAtributoDto } from '../dto/create-atributo.dto';
import { UpdateAtributoDto } from '../dto/update-atributo.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Atributos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('atributos')
export class AtributosController {
  constructor(private readonly atributosService: AtributosService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Crear un nuevo atributo' })
  @ApiResponse({ status: 201, description: 'Atributo creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  create(@Body() createAtributoDto: CreateAtributoDto) {
    return this.atributosService.create(createAtributoDto);
  }

  @Get()
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los atributos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de atributos obtenida exitosamente',
  })
  findAll() {
    return this.atributosService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener un atributo por ID' })
  @ApiResponse({ status: 200, description: 'Atributo encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.atributosService.findOne(id);
  }

  @Get('producto/:id_producto')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Obtener todos los atributos de un producto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de atributos obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findByProducto(@Param('id_producto', ParseIntPipe) id_producto: number) {
    return this.atributosService.findByProducto(id_producto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Actualizar un atributo' })
  @ApiResponse({
    status: 200,
    description: 'Atributo actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Atributo o producto no encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAtributoDto: UpdateAtributoDto,
  ) {
    return this.atributosService.update(id, updateAtributoDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EMPRESA')
  @ApiOperation({ summary: 'Eliminar un atributo' })
  @ApiResponse({ status: 200, description: 'Atributo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Atributo no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.atributosService.remove(id);
  }
}
