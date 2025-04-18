import { PartialType } from '@nestjs/swagger';
import { CreateNotaDebitoDto } from './create-nota-debito.dto';

export class UpdateNotaDebitoDto extends PartialType(CreateNotaDebitoDto) {}
