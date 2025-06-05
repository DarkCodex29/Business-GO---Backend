import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmpresaValidationService } from './empresa-validation.service';

export interface IConfiguracionService<T, CreateDto, UpdateDto> {
  create(empresaId: number, createDto: CreateDto): Promise<T>;
  findOne(empresaId: number): Promise<T>;
  update(empresaId: number, updateDto: UpdateDto): Promise<T>;
  remove(empresaId: number): Promise<{ message: string }>;
}

@Injectable()
export abstract class BaseConfiguracionService<T, CreateDto, UpdateDto>
  implements IConfiguracionService<T, CreateDto, UpdateDto>
{
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly empresaValidationService: EmpresaValidationService,
  ) {}

  // Template Method Pattern
  async create(empresaId: number, createDto: CreateDto): Promise<T> {
    try {
      // Validar que la empresa existe
      await this.empresaValidationService.validateEmpresaExists(empresaId);

      // Validar que no existe configuración previa
      await this.validateUniqueConfiguration(empresaId);

      // Validar datos específicos del tipo de configuración
      this.validateCreateData(createDto);

      // Crear la configuración
      const result = await this.createConfiguration(empresaId, createDto);

      this.logger.log(`Configuración creada para empresa ${empresaId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error al crear configuración para empresa ${empresaId}: ${error.message}`,
      );
      throw error;
    }
  }

  async findOne(empresaId: number): Promise<T> {
    try {
      const configuracion = await this.findConfiguration(empresaId);

      if (!configuracion) {
        throw new NotFoundException(
          `${this.getConfigurationName()} para empresa ${empresaId} no encontrada`,
        );
      }

      return configuracion;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Error al obtener configuración para empresa ${empresaId}: ${error.message}`,
      );
      throw error;
    }
  }

  async update(empresaId: number, updateDto: UpdateDto): Promise<T> {
    try {
      // Verificar que existe la configuración
      await this.findOne(empresaId);

      // Validar datos específicos del tipo de configuración
      this.validateUpdateData(updateDto);

      // Actualizar la configuración
      const result = await this.updateConfiguration(empresaId, updateDto);

      this.logger.log(`Configuración actualizada para empresa ${empresaId}`);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Error al actualizar configuración para empresa ${empresaId}: ${error.message}`,
      );
      throw error;
    }
  }

  async remove(empresaId: number): Promise<{ message: string }> {
    try {
      // Verificar que existe la configuración
      await this.findOne(empresaId);

      // Eliminar la configuración
      await this.deleteConfiguration(empresaId);

      this.logger.log(`Configuración eliminada para empresa ${empresaId}`);
      return {
        message: `${this.getConfigurationName()} eliminada correctamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Error al eliminar configuración para empresa ${empresaId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Métodos abstractos que deben implementar las clases hijas
  protected abstract getConfigurationName(): string;
  protected abstract findConfiguration(empresaId: number): Promise<T | null>;
  protected abstract createConfiguration(
    empresaId: number,
    createDto: CreateDto,
  ): Promise<T>;
  protected abstract updateConfiguration(
    empresaId: number,
    updateDto: UpdateDto,
  ): Promise<T>;
  protected abstract deleteConfiguration(empresaId: number): Promise<void>;
  protected abstract validateUniqueConfiguration(
    empresaId: number,
  ): Promise<void>;

  // Métodos opcionales que pueden ser sobrescritos
  protected validateCreateData(createDto: CreateDto): void {
    // Implementación por defecto vacía
  }

  protected validateUpdateData(updateDto: UpdateDto): void {
    // Implementación por defecto vacía
  }
}
