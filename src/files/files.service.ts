import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  /**
   * Procesa y sube una imagen a S3
   */
  async uploadImage(
    file: Express.Multer.File,
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento',
    entityId: number,
  ) {
    try {
      const fileName = `${entityType}/${entityId}/${uuidv4()}.webp`;
      const processedImageBuffer = await sharp(file.buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const command = new PutObjectCommand({
        Bucket: this.configService.get<string>('AWS_S3_BUCKET') ?? '',
        Key: fileName,
        Body: processedImageBuffer,
        ContentType: 'image/webp',
        ACL: 'public-read',
      });

      await this.s3.send(command);
      const s3Url = `https://${this.configService.get('AWS_S3_BUCKET')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileName}`;

      const metadata = await sharp(processedImageBuffer).metadata();

      const archivoMultimedia = await this.prisma.archivoMultimedia.create({
        data: {
          nombre_archivo: file.originalname,
          tipo_archivo: 'imagen',
          mime_type: 'image/webp',
          url_archivo: s3Url,
          tamanio_bytes: processedImageBuffer.length,
          dimensiones: {
            ancho: metadata.width,
            alto: metadata.height,
          },
          metadata: {
            originalName: file.originalname,
            originalSize: file.size,
            originalMimeType: file.mimetype,
          },
          ...(entityType === 'usuario' && { usuario_id: entityId }),
          ...(entityType === 'empresa' && { empresa_id: entityId }),
          ...(entityType === 'producto' && { producto_id: entityId }),
          ...(entityType === 'documento' && { documento_id: entityId }),
        },
      });

      return archivoMultimedia;
    } catch (error) {
      this.logger.error(`Error al subir imagen: ${error.message}`);
      throw error;
    }
  }

  /**
   * Elimina un archivo multimedia
   */
  async deleteFile(id: number) {
    try {
      const archivo = await this.prisma.archivoMultimedia.findUnique({
        where: { id_archivo: id },
      });

      if (!archivo) {
        throw new Error('Archivo no encontrado');
      }

      const key = archivo.url_archivo.split('/').slice(-3).join('/');
      const command = new DeleteObjectCommand({
        Bucket: this.configService.get<string>('AWS_S3_BUCKET') ?? '',
        Key: key,
      });

      await this.s3.send(command);

      await this.prisma.archivoMultimedia.delete({
        where: { id_archivo: id },
      });

      return true;
    } catch (error) {
      this.logger.error(`Error al eliminar archivo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene los archivos de una entidad
   */
  async getEntityFiles(
    entityType: 'usuario' | 'empresa' | 'producto' | 'documento',
    entityId: number,
  ) {
    try {
      const whereClause = {
        ...(entityType === 'usuario' && { usuario_id: entityId }),
        ...(entityType === 'empresa' && { empresa_id: entityId }),
        ...(entityType === 'producto' && { producto_id: entityId }),
        ...(entityType === 'documento' && { documento_id: entityId }),
      };

      return await this.prisma.archivoMultimedia.findMany({
        where: whereClause,
        orderBy: { fecha_subida: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error al obtener archivos: ${error.message}`);
      throw error;
    }
  }
}
