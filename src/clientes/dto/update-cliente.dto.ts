import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-cliente.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
