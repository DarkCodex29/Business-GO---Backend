import { PartialType } from '@nestjs/swagger';
import { CreateClienteDireccionDto } from './create-direccion.dto';

export class UpdateClienteDireccionDto extends PartialType(
  CreateClienteDireccionDto,
) {}
