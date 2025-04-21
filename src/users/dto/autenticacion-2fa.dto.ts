import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class Autenticacion2FADto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 1,
  })
  @IsNumber()
  id_usuario: number;

  @ApiProperty({
    description: 'Código 2FA',
    example: '123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  codigo?: string;
}
