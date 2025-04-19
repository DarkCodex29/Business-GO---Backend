import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'contraseña123' })
  @IsString()
  password: string;
}
