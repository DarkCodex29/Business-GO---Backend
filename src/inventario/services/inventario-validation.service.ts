import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductoValidationService } from '../../productos/services/producto-validation.service';
import { TipoMovimientoStock } from '../dto/movimiento-stock.dto';

export interface IInventarioValidator {
  validateMovimientoStock(
    productoId: number,
    empresaId: number,
    cantidad: number,
    tipoMovimiento: TipoMovimientoStock,
  ): Promise<void>;
  validateDisponibilidadUpdate(
    productoId: number,
    empresaId: number,
    cantidadDisponible: number,
  ): Promise<void>;
  validateUmbralStock(umbral: number): void;
  validateProductoFisico(productoId: number, empresaId: number): Promise<void>;
  validateStockSuficiente(
    productoId: number,
    cantidadRequerida: number,
  ): Promise<void>;
}

@Injectable()
export class InventarioValidationService implements IInventarioValidator {
  private readonly MIN_UMBRAL_STOCK = 0;
  private readonly MAX_UMBRAL_STOCK = 1000;
  private readonly MAX_CANTIDAD_MOVIMIENTO = 999999;

  constructor(
    private readonly prisma: PrismaService,
    private readonly productoValidationService: ProductoValidationService,
  ) {}

  async validateMovimientoStock(
    productoId: number,
    empresaId: number,
    cantidad: number,
    tipoMovimiento: TipoMovimientoStock,
  ): Promise<void> {
    // Validar que el producto existe y pertenece a la empresa
    await this.productoValidationService.validateProductoEmpresaExists(
      empresaId,
      productoId,
    );

    // Validar que es un producto físico
    await this.validateProductoFisico(productoId, empresaId);

    // Validar cantidad
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser un número positivo');
    }

    if (cantidad > this.MAX_CANTIDAD_MOVIMIENTO) {
      throw new BadRequestException(
        `La cantidad no puede exceder ${this.MAX_CANTIDAD_MOVIMIENTO.toLocaleString()} unidades`,
      );
    }

    // Validar que sea un número entero
    if (!Number.isInteger(cantidad)) {
      throw new BadRequestException('La cantidad debe ser un número entero');
    }

    // Para salidas, validar que hay stock suficiente
    if (tipoMovimiento === TipoMovimientoStock.SALIDA) {
      await this.validateStockSuficiente(productoId, cantidad);
    }
  }

  async validateDisponibilidadUpdate(
    productoId: number,
    empresaId: number,
    cantidadDisponible: number,
  ): Promise<void> {
    // Validar que el producto existe y pertenece a la empresa
    await this.productoValidationService.validateProductoEmpresaExists(
      empresaId,
      productoId,
    );

    // Validar que es un producto físico
    await this.validateProductoFisico(productoId, empresaId);

    // Validar cantidad disponible
    if (cantidadDisponible < 0) {
      throw new BadRequestException(
        'La cantidad disponible no puede ser negativa',
      );
    }

    if (cantidadDisponible > this.MAX_CANTIDAD_MOVIMIENTO) {
      throw new BadRequestException(
        `La cantidad disponible no puede exceder ${this.MAX_CANTIDAD_MOVIMIENTO.toLocaleString()} unidades`,
      );
    }

    // Validar que sea un número entero
    if (!Number.isInteger(cantidadDisponible)) {
      throw new BadRequestException(
        'La cantidad disponible debe ser un número entero',
      );
    }

    // Validar que no exceda el stock total
    const stock = await this.prisma.stock.findUnique({
      where: { id_producto: productoId },
      select: { cantidad: true },
    });

    if (stock && cantidadDisponible > stock.cantidad) {
      throw new BadRequestException(
        `La cantidad disponible (${cantidadDisponible}) no puede exceder el stock total (${stock.cantidad})`,
      );
    }
  }

  validateUmbralStock(umbral: number): void {
    if (umbral < this.MIN_UMBRAL_STOCK) {
      throw new BadRequestException(
        `El umbral mínimo es ${this.MIN_UMBRAL_STOCK}`,
      );
    }

    if (umbral > this.MAX_UMBRAL_STOCK) {
      throw new BadRequestException(
        `El umbral máximo es ${this.MAX_UMBRAL_STOCK}`,
      );
    }

    // Validar que sea un número entero
    if (!Number.isInteger(umbral)) {
      throw new BadRequestException('El umbral debe ser un número entero');
    }
  }

  async validateProductoFisico(
    productoId: number,
    empresaId: number,
  ): Promise<void> {
    const producto = await this.prisma.productoServicio.findFirst({
      where: {
        id_producto: productoId,
        id_empresa: empresaId,
      },
      select: { es_servicio: true, nombre: true },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${productoId} no encontrado para la empresa ${empresaId}`,
      );
    }

    if (producto.es_servicio) {
      throw new BadRequestException(
        `No se puede gestionar inventario para servicios. El producto "${producto.nombre}" es un servicio`,
      );
    }
  }

  async validateStockSuficiente(
    productoId: number,
    cantidadRequerida: number,
  ): Promise<void> {
    const stock = await this.prisma.stock.findUnique({
      where: { id_producto: productoId },
      include: {
        producto: {
          select: { nombre: true },
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `No existe registro de stock para el producto ${productoId}`,
      );
    }

    if (stock.cantidad < cantidadRequerida) {
      throw new BadRequestException(
        `Stock insuficiente para el producto "${stock.producto.nombre}". Stock actual: ${stock.cantidad}, Cantidad requerida: ${cantidadRequerida}`,
      );
    }
  }

  validateTipoMovimiento(tipo: string): void {
    const tiposValidos = ['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA'];
    if (!tiposValidos.includes(tipo.toUpperCase())) {
      throw new BadRequestException(
        `Tipo de movimiento inválido. Valores permitidos: ${tiposValidos.join(', ')}`,
      );
    }
  }

  validateMotivoMovimiento(motivo: string): void {
    if (!motivo || motivo.trim().length === 0) {
      throw new BadRequestException('El motivo del movimiento es obligatorio');
    }

    if (motivo.length < 5) {
      throw new BadRequestException(
        'El motivo debe tener al menos 5 caracteres',
      );
    }

    if (motivo.length > 200) {
      throw new BadRequestException(
        'El motivo no puede exceder 200 caracteres',
      );
    }
  }
}
