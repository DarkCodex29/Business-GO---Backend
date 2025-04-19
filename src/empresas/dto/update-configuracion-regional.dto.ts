import { PartialType } from '@nestjs/swagger';
import { CreateConfiguracionRegionalDto } from './create-configuracion-regional.dto';

export class UpdateConfiguracionRegionalDto extends PartialType(
  CreateConfiguracionRegionalDto,
) {}
