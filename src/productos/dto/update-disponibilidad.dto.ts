import { PartialType } from '@nestjs/swagger';
import { CreateDisponibilidadDto } from './create-disponibilidad.dto';

export class UpdateDisponibilidadDto extends PartialType(
  CreateDisponibilidadDto,
) {}
