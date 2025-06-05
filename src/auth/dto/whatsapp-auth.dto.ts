import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class InitiateWhatsAppLoginDto {
  @ApiProperty({
    description: 'Número de teléfono con código de país',
    example: '+51987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'El número de teléfono debe incluir el código de país (+51987654321)',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Nombre del contacto (opcional para registro automático)',
    example: 'Juan Pérez',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactName?: string;
}

export class VerifyWhatsAppLoginDto {
  @ApiProperty({
    description: 'ID de sesión recibido al iniciar el login',
    example: 'session_123456789',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Código de verificación recibido por WhatsApp',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'El código debe tener exactamente 6 dígitos',
  })
  code: string;
}

export class LinkWhatsAppAccountDto {
  @ApiProperty({
    description: 'ID del usuario existente',
    example: 1,
  })
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Número de WhatsApp a vincular',
    example: '+51987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El número de teléfono debe incluir el código de país',
  })
  whatsappNumber: string;

  @ApiProperty({
    description: 'ID de WhatsApp (opcional)',
    example: 'wa_123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  whatsappId?: string;
}
