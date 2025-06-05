import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoReporte } from '../dto/create-reporte.dto';

export interface IReportesValidator {
  validateEmpresaExists(empresaId: number): Promise<void>;
  validateUsuarioEmpresa(usuarioId: number, empresaId: number): Promise<void>;
  validateFechasReporte(fechaInicio?: Date, fechaFin?: Date): void;
  validateTipoReporte(tipoReporte: string): void;
  validateParametrosReporte(tipoReporte: string, parametros: any): void;
  validateLimitesReporte(empresaId: number, tipoReporte: string): Promise<void>;
  validateFormatoReporte(formato: string): void;
  validatePermisoReporte(
    usuarioId: number,
    empresaId: number,
    tipoReporte: string,
  ): Promise<void>;
}

@Injectable()
export class ReportesValidationService implements IReportesValidator {
  private readonly logger = new Logger(ReportesValidationService.name);

  // Límites empresariales para reportes (contexto peruano)
  private readonly LIMITES_REPORTES = {
    MAX_RANGO_DIAS: 365, // Máximo 1 año de datos
    MAX_REPORTES_DIARIOS: 50, // Máximo reportes por día
    MAX_REGISTROS_REPORTE: 10000, // Máximo registros por reporte
    FORMATOS_PERMITIDOS: ['pdf', 'excel', 'csv'],
    TIPOS_PERMITIDOS: Object.values(TipoReporte),
  };

  constructor(private readonly prisma: PrismaService) {}

  async validateEmpresaExists(empresaId: number): Promise<void> {
    if (!empresaId || empresaId <= 0) {
      throw new BadRequestException('ID de empresa inválido');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
      select: { id_empresa: true, estado: true, nombre: true },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }

    if (empresa.estado !== 'activo') {
      throw new ForbiddenException(
        `La empresa ${empresa.nombre} no está activa para generar reportes`,
      );
    }

    this.logger.log(`Empresa ${empresaId} validada para reportes`);
  }

  async validateUsuarioEmpresa(
    usuarioId: number,
    empresaId: number,
  ): Promise<void> {
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
        fecha_fin: null, // Usuario activo
      },
      include: {
        usuario: { select: { nombre: true, email: true } },
        empresa: { select: { nombre: true } },
      },
    });

    if (!usuarioEmpresa) {
      throw new ForbiddenException(
        'Usuario no tiene permisos para generar reportes en esta empresa',
      );
    }

    this.logger.log(
      `Usuario ${usuarioEmpresa.usuario.nombre} validado para reportes en empresa ${usuarioEmpresa.empresa.nombre}`,
    );
  }

  validateFechasReporte(fechaInicio?: Date, fechaFin?: Date): void {
    const ahora = new Date();
    const fechaLimiteAnterior = new Date();
    fechaLimiteAnterior.setDate(
      ahora.getDate() - this.LIMITES_REPORTES.MAX_RANGO_DIAS,
    );

    // Validar que las fechas no sean futuras
    if (fechaInicio && fechaInicio > ahora) {
      throw new BadRequestException('La fecha de inicio no puede ser futura');
    }

    if (fechaFin && fechaFin > ahora) {
      throw new BadRequestException('La fecha de fin no puede ser futura');
    }

    // Validar orden de fechas
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    // Validar rango máximo (contexto empresarial peruano)
    if (fechaInicio && fechaFin) {
      const diferenciaDias = Math.ceil(
        (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diferenciaDias > this.LIMITES_REPORTES.MAX_RANGO_DIAS) {
        throw new BadRequestException(
          `El rango de fechas no puede exceder ${this.LIMITES_REPORTES.MAX_RANGO_DIAS} días (${Math.floor(this.LIMITES_REPORTES.MAX_RANGO_DIAS / 30)} meses)`,
        );
      }
    }

    // Validar que no sea muy antiguo (límite empresarial)
    if (fechaInicio && fechaInicio < fechaLimiteAnterior) {
      throw new BadRequestException(
        `La fecha de inicio no puede ser anterior a ${fechaLimiteAnterior.toLocaleDateString('es-PE')} (${this.LIMITES_REPORTES.MAX_RANGO_DIAS} días atrás)`,
      );
    }

    this.logger.log('Fechas de reporte validadas correctamente');
  }

  validateTipoReporte(tipoReporte: string): void {
    if (!tipoReporte) {
      throw new BadRequestException('El tipo de reporte es obligatorio');
    }

    if (
      !this.LIMITES_REPORTES.TIPOS_PERMITIDOS.includes(
        tipoReporte as TipoReporte,
      )
    ) {
      throw new BadRequestException(
        `Tipo de reporte no válido. Tipos permitidos: ${this.LIMITES_REPORTES.TIPOS_PERMITIDOS.join(', ')}`,
      );
    }

    this.logger.log(`Tipo de reporte ${tipoReporte} validado`);
  }

  validateParametrosReporte(tipoReporte: string, parametros: any): void {
    if (!parametros) {
      this.logger.warn(`Reporte ${tipoReporte} sin parámetros específicos`);
      return;
    }

    switch (tipoReporte) {
      case TipoReporte.VENTAS:
        this.validateParametrosVentas(parametros);
        break;
      case TipoReporte.COMPRAS:
        this.validateParametrosCompras(parametros);
        break;
      case TipoReporte.INVENTARIO:
        this.validateParametrosInventario(parametros);
        break;
      case TipoReporte.CLIENTES:
        this.validateParametrosClientes(parametros);
        break;
      case TipoReporte.PRODUCTOS:
        this.validateParametrosProductos(parametros);
        break;
      case TipoReporte.FINANCIERO:
        this.validateParametrosFinanciero(parametros);
        break;
      default:
        this.logger.warn(
          `Validación de parámetros no implementada para tipo: ${tipoReporte}`,
        );
    }
  }

  private validateParametrosVentas(parametros: any): void {
    const { agrupar_por, incluir_detalles } = parametros;

    if (
      agrupar_por &&
      !['dia', 'semana', 'mes', 'producto', 'cliente'].includes(agrupar_por)
    ) {
      throw new BadRequestException(
        'Agrupación de ventas debe ser: dia, semana, mes, producto o cliente',
      );
    }

    if (
      incluir_detalles !== undefined &&
      typeof incluir_detalles !== 'boolean'
    ) {
      throw new BadRequestException(
        'El parámetro incluir_detalles debe ser verdadero o falso',
      );
    }
  }

  private validateParametrosCompras(parametros: any): void {
    const { agrupar_por, incluir_detalles } = parametros;

    if (
      agrupar_por &&
      !['dia', 'semana', 'mes', 'producto', 'proveedor'].includes(agrupar_por)
    ) {
      throw new BadRequestException(
        'Agrupación de compras debe ser: dia, semana, mes, producto o proveedor',
      );
    }

    if (
      incluir_detalles !== undefined &&
      typeof incluir_detalles !== 'boolean'
    ) {
      throw new BadRequestException(
        'El parámetro incluir_detalles debe ser verdadero o falso',
      );
    }
  }

  private validateParametrosInventario(parametros: any): void {
    const { incluir_bajos, umbral_minimo, agrupar_por } = parametros;

    if (incluir_bajos !== undefined && typeof incluir_bajos !== 'boolean') {
      throw new BadRequestException(
        'El parámetro incluir_bajos debe ser verdadero o falso',
      );
    }

    if (umbral_minimo !== undefined) {
      if (typeof umbral_minimo !== 'number' || umbral_minimo < 0) {
        throw new BadRequestException(
          'El umbral mínimo debe ser un número mayor o igual a 0',
        );
      }

      if (umbral_minimo > 10000) {
        throw new BadRequestException(
          'El umbral mínimo no puede exceder 10,000 unidades',
        );
      }
    }

    if (
      agrupar_por &&
      !['categoria', 'subcategoria', 'proveedor'].includes(agrupar_por)
    ) {
      throw new BadRequestException(
        'Agrupación de inventario debe ser: categoria, subcategoria o proveedor',
      );
    }
  }

  private validateParametrosClientes(parametros: any): void {
    const { tipo_cliente, incluir_compras, incluir_valoraciones } = parametros;

    if (
      tipo_cliente &&
      !['individual', 'corporativo', 'todos'].includes(tipo_cliente)
    ) {
      throw new BadRequestException(
        'Tipo de cliente debe ser: individual, corporativo o todos',
      );
    }

    if (incluir_compras !== undefined && typeof incluir_compras !== 'boolean') {
      throw new BadRequestException(
        'El parámetro incluir_compras debe ser verdadero o falso',
      );
    }

    if (
      incluir_valoraciones !== undefined &&
      typeof incluir_valoraciones !== 'boolean'
    ) {
      throw new BadRequestException(
        'El parámetro incluir_valoraciones debe ser verdadero o falso',
      );
    }
  }

  private validateParametrosProductos(parametros: any): void {
    const { categoria_id, subcategoria_id, incluir_stock, incluir_ventas } =
      parametros;

    if (categoria_id !== undefined) {
      if (typeof categoria_id !== 'number' || categoria_id <= 0) {
        throw new BadRequestException(
          'El ID de categoría debe ser un número positivo',
        );
      }
    }

    if (subcategoria_id !== undefined) {
      if (typeof subcategoria_id !== 'number' || subcategoria_id <= 0) {
        throw new BadRequestException(
          'El ID de subcategoría debe ser un número positivo',
        );
      }
    }

    if (incluir_stock !== undefined && typeof incluir_stock !== 'boolean') {
      throw new BadRequestException(
        'El parámetro incluir_stock debe ser verdadero o falso',
      );
    }

    if (incluir_ventas !== undefined && typeof incluir_ventas !== 'boolean') {
      throw new BadRequestException(
        'El parámetro incluir_ventas debe ser verdadero o falso',
      );
    }
  }

  private validateParametrosFinanciero(parametros: any): void {
    const { tipo, incluir_impuestos, incluir_detalles } = parametros;

    if (tipo && !['ventas', 'compras', 'general'].includes(tipo)) {
      throw new BadRequestException(
        'Tipo financiero debe ser: ventas, compras o general',
      );
    }

    if (
      incluir_impuestos !== undefined &&
      typeof incluir_impuestos !== 'boolean'
    ) {
      throw new BadRequestException(
        'El parámetro incluir_impuestos debe ser verdadero o falso',
      );
    }

    if (
      incluir_detalles !== undefined &&
      typeof incluir_detalles !== 'boolean'
    ) {
      throw new BadRequestException(
        'El parámetro incluir_detalles debe ser verdadero o falso',
      );
    }
  }

  async validateLimitesReporte(
    empresaId: number,
    tipoReporte: string,
  ): Promise<void> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    // Contar reportes ejecutados hoy
    const reportesHoy = await this.prisma.ejecucionReporte.count({
      where: {
        fecha_inicio: {
          gte: hoy,
          lt: manana,
        },
        reporte: {
          id_empresa: empresaId,
          tipo_reporte: tipoReporte,
        },
      },
    });

    if (reportesHoy >= this.LIMITES_REPORTES.MAX_REPORTES_DIARIOS) {
      throw new BadRequestException(
        `Se ha alcanzado el límite diario de ${this.LIMITES_REPORTES.MAX_REPORTES_DIARIOS} reportes de tipo ${tipoReporte}`,
      );
    }

    this.logger.log(
      `Límites de reporte validados: ${reportesHoy}/${this.LIMITES_REPORTES.MAX_REPORTES_DIARIOS} reportes hoy`,
    );
  }

  validateFormatoReporte(formato: string): void {
    if (!formato) {
      throw new BadRequestException('El formato de reporte es obligatorio');
    }

    if (
      !this.LIMITES_REPORTES.FORMATOS_PERMITIDOS.includes(formato.toLowerCase())
    ) {
      throw new BadRequestException(
        `Formato no válido. Formatos permitidos: ${this.LIMITES_REPORTES.FORMATOS_PERMITIDOS.join(', ')}`,
      );
    }

    this.logger.log(`Formato de reporte ${formato} validado`);
  }

  async validatePermisoReporte(
    usuarioId: number,
    empresaId: number,
    tipoReporte: string,
  ): Promise<void> {
    // Validar que el usuario tenga permisos específicos para el tipo de reporte
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
        fecha_fin: null,
      },
      include: {
        rol_empresa: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (!usuarioEmpresa?.rol_empresa) {
      throw new ForbiddenException(
        'Usuario no tiene rol asignado en la empresa para generar reportes',
      );
    }

    // Verificar permisos específicos por tipo de reporte
    const permisoRequerido = this.getPermisoRequerido(tipoReporte);
    const tienePermiso = usuarioEmpresa.rol_empresa.permisos.some(
      (permisoRol) => permisoRol.permiso.nombre === permisoRequerido,
    );

    if (!tienePermiso) {
      throw new ForbiddenException(
        `Usuario no tiene permisos para generar reportes de tipo ${tipoReporte}`,
      );
    }

    this.logger.log(
      `Permisos validados para usuario ${usuarioId} en reporte ${tipoReporte}`,
    );
  }

  private getPermisoRequerido(tipoReporte: string): string {
    const permisos = {
      [TipoReporte.VENTAS]: 'reportes:ventas:read',
      [TipoReporte.COMPRAS]: 'reportes:compras:read',
      [TipoReporte.INVENTARIO]: 'reportes:inventario:read',
      [TipoReporte.CLIENTES]: 'reportes:clientes:read',
      [TipoReporte.PRODUCTOS]: 'reportes:productos:read',
      [TipoReporte.FINANCIERO]: 'reportes:financiero:read',
    };

    return permisos[tipoReporte] || 'reportes:read';
  }

  // Método para validar configuración regional peruana
  validateConfiguracionRegional(empresaId: number): Promise<void> {
    return this.prisma.configuracionRegional
      .findUnique({
        where: { id_empresa: empresaId },
      })
      .then((config) => {
        if (!config) {
          this.logger.warn(
            `Empresa ${empresaId} sin configuración regional, usando valores por defecto para Perú`,
          );
          return;
        }

        if (config.zona_horaria !== 'America/Lima') {
          this.logger.warn(
            `Empresa ${empresaId} con zona horaria ${config.zona_horaria}, se recomienda America/Lima para Perú`,
          );
        }

        this.logger.log(
          `Configuración regional validada para empresa ${empresaId}`,
        );
      });
  }
}
