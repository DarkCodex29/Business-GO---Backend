import { PartialType } from '@nestjs/swagger';
import { CreateConfiguracionImpuestosDto } from './create-configuracion-impuestos.dto';

export class UpdateConfiguracionImpuestosDto extends PartialType(
  CreateConfiguracionImpuestosDto,
) {}
