import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export abstract class BaseCrudService<T, CreateDto, UpdateDto> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
    protected readonly entityName: string,
  ) {}

  protected abstract getModel(): any;

  async findByIdOrThrow(id: number, include?: any): Promise<T> {
    const entity = await this.getModel().findUnique({
      where: this.getIdField(id),
      include,
    });

    if (!entity) {
      throw new NotFoundException(`${this.entityName} no encontrado`);
    }

    return entity;
  }

  async existsOrThrow(id: number): Promise<void> {
    const exists = await this.getModel().findUnique({
      where: this.getIdField(id),
      select: this.getIdField(1), // Solo seleccionar el ID para optimizar
    });

    if (!exists) {
      throw new NotFoundException(`${this.entityName} no encontrado`);
    }
  }

  protected abstract getIdField(id: number): any;

  protected logOperation(operation: string, id?: number, details?: any): void {
    const message = id
      ? `${operation} ${this.entityName} ID: ${id}`
      : `${operation} ${this.entityName}`;

    if (details) {
      this.logger.log(`${message} - ${JSON.stringify(details)}`);
    } else {
      this.logger.log(message);
    }
  }

  protected handleError(operation: string, error: any, id?: number): never {
    const message = id
      ? `Error en ${operation} ${this.entityName} ID: ${id}`
      : `Error en ${operation} ${this.entityName}`;

    this.logger.error(message, error);
    throw error;
  }
}
