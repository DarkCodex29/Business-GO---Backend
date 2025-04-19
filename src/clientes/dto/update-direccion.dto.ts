import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDireccionDto } from './create-direccion.dto';

export class UpdateClienteDireccionDto extends PartialType(
  CreateClienteDireccionDto,
) {}
