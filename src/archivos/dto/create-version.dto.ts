import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateVersionDto {
  @ApiProperty({
    description: 'Descripción de los cambios realizados en esta versión',
    required: false,
  })
  @IsString()
  @IsOptional()
  cambios?: string;
}
