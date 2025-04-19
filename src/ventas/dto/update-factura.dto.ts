import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateFacturaDto {
  @ApiProperty({
    description: 'Estado de la factura',
    example: 'EMITIDA',
    enum: ['EMITIDA', 'ANULADA', 'PAGADA'],
    required: false,
  })
  @IsEnum(['EMITIDA', 'ANULADA', 'PAGADA'])
  @IsOptional()
  estado?: string;

  @ApiProperty({
    description: 'Notas o comentarios adicionales',
    example: 'Factura anulada por error en los datos',
    required: false,
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
