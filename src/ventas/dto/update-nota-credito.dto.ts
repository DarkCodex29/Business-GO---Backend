import { PartialType } from '@nestjs/swagger';
import { CreateNotaCreditoDto } from './create-nota-credito.dto';

export class UpdateNotaCreditoDto extends PartialType(CreateNotaCreditoDto) {}
