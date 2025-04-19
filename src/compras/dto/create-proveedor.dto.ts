import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsBoolean,
} from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({ description: 'Nombre del proveedor' })
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'RUC del proveedor' })
  @IsString()
  ruc: string;

  @ApiProperty({ description: 'Dirección del proveedor' })
  @IsString()
  direccion: string;

  @ApiProperty({ description: 'Teléfono del proveedor' })
  @IsPhoneNumber()
  telefono: string;

  @ApiProperty({ description: 'Email del proveedor' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contacto principal del proveedor' })
  @IsString()
  @IsOptional()
  contacto_principal?: string;

  @ApiProperty({ description: 'Notas adicionales sobre el proveedor' })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiProperty({ description: 'Estado del proveedor' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
