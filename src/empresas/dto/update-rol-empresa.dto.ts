import { PartialType } from '@nestjs/swagger';
import { CreateRolEmpresaDto } from './create-rol-empresa.dto';

export class UpdateRolEmpresaDto extends PartialType(CreateRolEmpresaDto) {}
