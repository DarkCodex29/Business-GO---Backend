import { PartialType } from '@nestjs/swagger';
import { CreateOrdenVentaDto } from './create-orden-venta.dto';

export class UpdateOrdenVentaDto extends PartialType(CreateOrdenVentaDto) {}
