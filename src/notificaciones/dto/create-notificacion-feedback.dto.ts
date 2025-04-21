import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNotificacionFeedbackDto {
  @ApiProperty({
    description: 'Descripción del feedback sobre la notificación',
    example: 'La notificación fue clara y útil',
  })
  @IsString()
  descripcion: string;

  @ApiProperty({
    description: 'ID de la notificación sobre la que se está dando feedback',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  notificacionId?: number;
}
