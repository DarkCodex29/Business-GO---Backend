import { PartialType } from '@nestjs/swagger';
import { CreateEmpresaRolDto } from './create-rol-empresa.dto';

export class UpdateEmpresaRolDto extends PartialType(CreateEmpresaRolDto) {}
