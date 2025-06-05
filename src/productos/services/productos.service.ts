import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';
import { BaseProductoService, IProductoQuery } from './base-producto.service';
import { ProductoValidationService } from './producto-validation.service';

@Injectable()
export class ProductosService extends BaseProductoService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly productoValidationService: ProductoValidationService,
  ) {
    super(prisma, productoValidationService);
  }

  async getProductos(empresaId: number, query?: Partial<IProductoQuery>) {
    const productoQuery: IProductoQuery = {
      empresaId,
      ...query,
    };
    return this.findProductosByEmpresa(productoQuery);
  }

  async getProducto(empresaId: number, productoId: number) {
    return this.findProductoByEmpresa(empresaId, productoId);
  }

  async createProducto(
    empresaId: number,
    createProductoDto: CreateProductoDto,
  ) {
    try {
      const {
        nombre,
        precio,
        id_categoria,
        id_subcategoria,
        es_servicio = false,
      } = createProductoDto;

      // Validaciones usando el servicio especializado
      this.productoValidationService.validateNombre(nombre);
      this.productoValidationService.validatePrecio(precio);
      this.productoValidationService.validateTipoProducto(es_servicio);

      // Validar categoría y subcategoría
      await this.productoValidationService.validateCategoriaExists(
        id_categoria,
      );
      if (id_subcategoria) {
        await this.productoValidationService.validateSubcategoriaExists(
          id_subcategoria,
          id_categoria,
        );
      }

      // Validar nombre único en la empresa
      await this.productoValidationService.validateUniqueNombre(
        nombre,
        empresaId,
      );

      // Preparar datos del producto
      const productoData = {
        nombre: nombre.trim(),
        precio,
        id_categoria,
        id_subcategoria,
        es_servicio,
      };

      return this.createProductoTransaction(empresaId, productoData);
    } catch (error) {
      this.logger.error(`Error al crear producto: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un producto con este nombre en la empresa',
        );
      }

      throw error;
    }
  }

  async updateProducto(
    empresaId: number,
    productoId: number,
    updateProductoDto: UpdateProductoDto,
  ) {
    try {
      // Verificar que el producto existe para la empresa
      await this.productoValidationService.validateProductoEmpresaExists(
        empresaId,
        productoId,
      );

      const {
        nombre,
        precio,
        id_categoria,
        id_subcategoria,
        es_servicio,
        ...restData
      } = updateProductoDto;

      // Validaciones si se proporcionan los campos
      if (nombre) {
        this.productoValidationService.validateNombre(nombre);
        await this.productoValidationService.validateUniqueNombre(
          nombre,
          empresaId,
          productoId,
        );
      }

      if (precio !== undefined) {
        this.productoValidationService.validatePrecio(precio);
      }

      if (id_categoria) {
        await this.productoValidationService.validateCategoriaExists(
          id_categoria,
        );
      }

      if (id_subcategoria && id_categoria) {
        await this.productoValidationService.validateSubcategoriaExists(
          id_subcategoria,
          id_categoria,
        );
      }

      if (es_servicio !== undefined) {
        this.productoValidationService.validateTipoProducto(es_servicio);
      }

      // Preparar datos para actualizar
      const updateData: any = {
        ...restData,
        nombre: nombre?.trim(),
        precio,
        id_categoria,
        id_subcategoria,
        es_servicio,
      };

      // Limpiar campos undefined
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      return this.updateProductoTransaction(productoId, updateData);
    } catch (error) {
      this.logger.error(
        `Error al actualizar producto ${productoId}: ${error.message}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un producto con este nombre en la empresa',
        );
      }

      throw error;
    }
  }

  async deleteProducto(empresaId: number, productoId: number) {
    return this.deleteProductoTransaction(empresaId, productoId);
  }

  async getProductoStats(empresaId: number) {
    return super.getProductoStats(empresaId);
  }

  async searchProductos(empresaId: number, searchTerm: string) {
    return super.searchProductos(empresaId, searchTerm);
  }

  // Métodos específicos para productos
  async findAll(empresaId: number) {
    return this.getProductos(empresaId);
  }

  async findOne(id: number, empresaId: number) {
    return this.getProducto(empresaId, id);
  }

  async create(empresaId: number, createProductoDto: CreateProductoDto) {
    return this.createProducto(empresaId, createProductoDto);
  }

  async update(
    id: number,
    empresaId: number,
    updateProductoDto: UpdateProductoDto,
  ) {
    return this.updateProducto(empresaId, id, updateProductoDto);
  }

  async remove(id: number, empresaId: number) {
    return this.deleteProducto(empresaId, id);
  }
}
