import { PartialType } from '@nestjs/swagger';
import { CreateConfiguracionMonedaDto } from './create-configuracion-moneda.dto';

export class UpdateConfiguracionMonedaDto extends PartialType(
  CreateConfiguracionMonedaDto,
) {}
