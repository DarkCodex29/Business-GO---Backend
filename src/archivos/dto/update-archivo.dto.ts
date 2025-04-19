import { PartialType } from '@nestjs/swagger';
import { CreateArchivoDto } from './create-archivo.dto';

export class UpdateArchivoDto extends PartialType(CreateArchivoDto) {}
