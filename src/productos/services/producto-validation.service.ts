import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IProductoValidator {
  validateNombre(nombre: string): void;
  validatePrecio(precio: number): void;
  validateCategoriaExists(categoriaId: number): Promise<void>;
  validateSubcategoriaExists(
    subcategoriaId: number,
    categoriaId: number,
  ): Promise<void>;
  validateProductoEmpresaExists(
    empresaId: number,
    productoId: number,
  ): Promise<void>;
  validateUniqueNombre(
    nombre: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void>;
  validateTipoProducto(esServicio: boolean, stock?: number): void;
}

@Injectable()
export class ProductoValidationService implements IProductoValidator {
  private readonly MIN_PRECIO = 0.01; // S/ 0.01 mínimo
  private readonly MAX_PRECIO = 1000000; // S/ 1,000,000 máximo
  private readonly MIN_NOMBRE_LENGTH = 3;
  private readonly MAX_NOMBRE_LENGTH = 100;

  constructor(private readonly prisma: PrismaService) {}

  validateNombre(nombre: string): void {
    if (!nombre || nombre.trim().length === 0) {
      throw new BadRequestException('El nombre del producto es obligatorio');
    }

    if (nombre.length < this.MIN_NOMBRE_LENGTH) {
      throw new BadRequestException(
        `El nombre debe tener al menos ${this.MIN_NOMBRE_LENGTH} caracteres`,
      );
    }

    if (nombre.length > this.MAX_NOMBRE_LENGTH) {
      throw new BadRequestException(
        `El nombre no puede exceder ${this.MAX_NOMBRE_LENGTH} caracteres`,
      );
    }

    // Validar caracteres permitidos (letras, números, espacios, guiones)
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/;
    if (!nombreRegex.test(nombre)) {
      throw new BadRequestException(
        'El nombre solo puede contener letras, números, espacios, guiones y puntos',
      );
    }

    // Validar que no sea solo números
    if (/^\d+$/.test(nombre.trim())) {
      throw new BadRequestException('El nombre no puede ser solo números');
    }
  }

  validatePrecio(precio: number): void {
    if (precio === undefined || precio === null) {
      throw new BadRequestException('El precio es obligatorio');
    }

    if (precio < this.MIN_PRECIO) {
      throw new BadRequestException(
        `El precio mínimo es S/ ${this.MIN_PRECIO}`,
      );
    }

    if (precio > this.MAX_PRECIO) {
      throw new BadRequestException(
        `El precio máximo es S/ ${this.MAX_PRECIO.toLocaleString()}`,
      );
    }

    // Validar que tenga máximo 2 decimales
    const decimales = (precio.toString().split('.')[1] || '').length;
    if (decimales > 2) {
      throw new BadRequestException(
        'El precio no puede tener más de 2 decimales',
      );
    }
  }

  async validateCategoriaExists(categoriaId: number): Promise<void> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: categoriaId },
      select: { id_categoria: true, nombre: true },
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${categoriaId} no encontrada`,
      );
    }
  }

  async validateSubcategoriaExists(
    subcategoriaId: number,
    categoriaId: number,
  ): Promise<void> {
    const subcategoria = await this.prisma.subcategoria.findFirst({
      where: {
        id_subcategoria: subcategoriaId,
        id_categoria: categoriaId,
      },
      select: { id_subcategoria: true, nombre: true },
    });

    if (!subcategoria) {
      throw new NotFoundException(
        `Subcategoría con ID ${subcategoriaId} no encontrada para la categoría ${categoriaId}`,
      );
    }
  }

  async validateProductoEmpresaExists(
    empresaId: number,
    productoId: number,
  ): Promise<void> {
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: productoId,
        id_empresa: empresaId,
      },
      select: { id_producto: true, nombre: true },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${productoId} no encontrado para la empresa ${empresaId}`,
      );
    }
  }

  async validateUniqueNombre(
    nombre: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = {
      nombre: {
        equals: nombre.trim(),
        mode: 'insensitive',
      },
      id_empresa: empresaId,
    };

    if (excludeId) {
      whereClause.NOT = { id_producto: excludeId };
    }

    const existingProducto = await this.prisma.productoServicio.findFirst({
      where: whereClause,
      select: { id_producto: true, nombre: true },
    });

    if (existingProducto) {
      throw new BadRequestException(
        `Ya existe un producto con el nombre "${nombre}" en esta empresa`,
      );
    }
  }

  validateTipoProducto(esServicio: boolean, stock?: number): void {
    if (esServicio && stock !== undefined && stock > 0) {
      throw new BadRequestException(
        'Los servicios no pueden tener stock físico',
      );
    }

    if (!esServicio && stock !== undefined && stock < 0) {
      throw new BadRequestException(
        'El stock de productos físicos no puede ser negativo',
      );
    }
  }

  validateStock(cantidad: number): void {
    if (cantidad < 0) {
      throw new BadRequestException(
        'La cantidad de stock no puede ser negativa',
      );
    }

    if (cantidad > 999999) {
      throw new BadRequestException(
        'La cantidad de stock no puede exceder 999,999 unidades',
      );
    }

    // Validar que sea un número entero
    if (!Number.isInteger(cantidad)) {
      throw new BadRequestException(
        'La cantidad de stock debe ser un número entero',
      );
    }
  }

  validateDisponibilidad(cantidad: number): void {
    if (cantidad < 0) {
      throw new BadRequestException(
        'La cantidad disponible no puede ser negativa',
      );
    }

    if (cantidad > 999999) {
      throw new BadRequestException(
        'La cantidad disponible no puede exceder 999,999 unidades',
      );
    }

    // Validar que sea un número entero
    if (!Number.isInteger(cantidad)) {
      throw new BadRequestException(
        'La cantidad disponible debe ser un número entero',
      );
    }
  }
}
