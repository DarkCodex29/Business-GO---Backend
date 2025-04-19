import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-cliente.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
