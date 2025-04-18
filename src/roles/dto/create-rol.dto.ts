import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRolDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'ADMIN',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
