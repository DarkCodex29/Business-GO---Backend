import { PartialType } from '@nestjs/swagger';
import { CreateValoracionDto } from './create-valoracion.dto';

export class UpdateValoracionDto extends PartialType(CreateValoracionDto) {}
