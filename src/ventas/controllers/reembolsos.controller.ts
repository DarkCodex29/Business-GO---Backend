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
import { ReembolsosService } from '../services/reembolsos.service';
import { CreateReembolsoDto } from '../dto/create-reembolso.dto';
import { UpdateReembolsoDto } from '../dto/update-reembolso.dto';
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

@ApiTags('Reembolsos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reembolsos')
export class ReembolsosController {
  constructor(private readonly reembolsosService: ReembolsosService) {}

  @Post()
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
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
  @Roles('ADMIN', 'EMPRESA')
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
