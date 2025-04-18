import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    description: 'Tipo de entidad a la que pertenece el archivo',
    enum: ['usuario', 'empresa', 'producto', 'documento'],
    example: 'usuario',
  })
  @IsEnum(['usuario', 'empresa', 'producto', 'documento'])
  @IsNotEmpty()
  entityType: 'usuario' | 'empresa' | 'producto' | 'documento';

  @ApiProperty({
    description: 'ID de la entidad a la que pertenece el archivo',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  entityId: number;
}
