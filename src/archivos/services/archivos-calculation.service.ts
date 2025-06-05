import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchivoFormatted, MetricasArchivos } from './base-archivos.service';

export interface EstadisticasArchivo {
  total_archivos: number;
  total_tamanio_bytes: number;
  total_tamanio_mb: number;
  promedio_tamanio_bytes: number;
  archivo_mas_grande: ArchivoFormatted | null;
  archivo_mas_pequeno: ArchivoFormatted | null;
  tipos_archivo: {
    tipo: string;
    cantidad: number;
    porcentaje: number;
  }[];
  archivos_recientes: ArchivoFormatted[];
}

export interface TendenciaArchivos {
  fecha: string;
  archivos_subidos: number;
  tamanio_total_bytes: number;
  tamanio_total_mb: number;
}

export interface AnalisisUso {
  archivos_mas_descargados: {
    archivo: ArchivoFormatted;
    descargas: number;
  }[];
  archivos_sin_uso: ArchivoFormatted[];
  categorias_mas_usadas: {
    categoria: string;
    cantidad_archivos: number;
    tamanio_total_bytes: number;
  }[];
  usuarios_mas_activos: {
    usuario_id: number;
    nombre: string;
    email: string;
    archivos_subidos: number;
    tamanio_total_bytes: number;
  }[];
}

export interface ReporteAlmacenamiento {
  limite_almacenamiento_bytes: number;
  limite_almacenamiento_mb: number;
  uso_actual_bytes: number;
  uso_actual_mb: number;
  porcentaje_uso: number;
  espacio_disponible_bytes: number;
  espacio_disponible_mb: number;
  proyeccion_agotamiento_dias?: number;
}

@Injectable()
export class ArchivosCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcular métricas generales de archivos de una empresa
   */
  async calculateMetricasGenerales(
    empresaId: number,
  ): Promise<MetricasArchivos> {
    // Obtener estadísticas básicas
    const stats = await this.prisma.archivoMultimedia.aggregate({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _count: {
        id_archivo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
      _avg: {
        tamanio_bytes: true,
      },
    });

    const totalArchivos = stats._count.id_archivo || 0;
    const totalTamanioBytes = stats._sum.tamanio_bytes || 0;
    const promedioTamanioBytes = stats._avg.tamanio_bytes || 0;

    // Obtener archivos por tipo
    const archivosPorTipo = await this.prisma.archivoMultimedia.groupBy({
      by: ['tipo_archivo'],
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _count: {
        id_archivo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
    });

    // Obtener archivos por categoría
    const archivosPorCategoria = await this.prisma.archivoMultimedia.groupBy({
      by: ['categoria_id'],
      where: {
        empresa_id: empresaId,
        activo: true,
        categoria_id: { not: null },
      },
      _count: {
        id_archivo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
    });

    // Obtener nombres de categorías
    const categoriaIds = archivosPorCategoria
      .map((item) => item.categoria_id)
      .filter(Boolean);
    const categorias = await this.prisma.categoriaArchivo.findMany({
      where: {
        id_categoria_archivo: { in: categoriaIds as number[] },
      },
    });

    const categoriaMap = new Map(
      categorias.map((cat) => [cat.id_categoria_archivo, cat.nombre]),
    );

    // Obtener archivos recientes
    const archivosRecientes = await this.prisma.archivoMultimedia.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      orderBy: {
        fecha_subida: 'desc',
      },
      take: 10,
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    // Obtener archivos más grandes
    const archivosMasGrandes = await this.prisma.archivoMultimedia.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      orderBy: {
        tamanio_bytes: 'desc',
      },
      take: 10,
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return {
      total_archivos: totalArchivos,
      total_tamanio_bytes: totalTamanioBytes,
      total_tamanio_mb:
        Math.round((totalTamanioBytes / (1024 * 1024)) * 100) / 100,
      promedio_tamanio_bytes: Math.round(promedioTamanioBytes),
      archivos_por_tipo: archivosPorTipo.map((item) => ({
        tipo: item.tipo_archivo,
        cantidad: item._count.id_archivo,
        tamanio_total_bytes: item._sum.tamanio_bytes || 0,
      })),
      archivos_por_categoria: archivosPorCategoria.map((item) => ({
        categoria: categoriaMap.get(item.categoria_id!) || 'Sin categoría',
        cantidad: item._count.id_archivo,
        tamanio_total_bytes: item._sum.tamanio_bytes || 0,
      })),
      archivos_recientes: this.formatArchivosForMetrics(archivosRecientes),
      archivos_mas_grandes: this.formatArchivosForMetrics(archivosMasGrandes),
    };
  }

  /**
   * Calcular estadísticas detalladas de archivos
   */
  async calculateEstadisticasArchivo(
    empresaId: number,
  ): Promise<EstadisticasArchivo> {
    // Obtener estadísticas básicas
    const stats = await this.prisma.archivoMultimedia.aggregate({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _count: {
        id_archivo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
      _avg: {
        tamanio_bytes: true,
      },
    });

    const totalArchivos = stats._count.id_archivo || 0;
    const totalTamanioBytes = stats._sum.tamanio_bytes || 0;
    const promedioTamanioBytes = stats._avg.tamanio_bytes || 0;

    // Obtener archivo más grande
    const archivoMasGrande = await this.prisma.archivoMultimedia.findFirst({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      orderBy: {
        tamanio_bytes: 'desc',
      },
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    // Obtener archivo más pequeño
    const archivoMasPequeno = await this.prisma.archivoMultimedia.findFirst({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      orderBy: {
        tamanio_bytes: 'asc',
      },
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    // Obtener distribución por tipos
    const tiposArchivo = await this.prisma.archivoMultimedia.groupBy({
      by: ['tipo_archivo'],
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _count: {
        id_archivo: true,
      },
    });

    const tiposConPorcentaje = tiposArchivo.map((tipo) => ({
      tipo: tipo.tipo_archivo,
      cantidad: tipo._count.id_archivo,
      porcentaje:
        totalArchivos > 0
          ? Math.round((tipo._count.id_archivo / totalArchivos) * 100 * 100) /
            100
          : 0,
    }));

    // Obtener archivos recientes
    const archivosRecientes = await this.prisma.archivoMultimedia.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      orderBy: {
        fecha_subida: 'desc',
      },
      take: 5,
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return {
      total_archivos: totalArchivos,
      total_tamanio_bytes: totalTamanioBytes,
      total_tamanio_mb:
        Math.round((totalTamanioBytes / (1024 * 1024)) * 100) / 100,
      promedio_tamanio_bytes: Math.round(promedioTamanioBytes),
      archivo_mas_grande: archivoMasGrande
        ? this.formatArchivoForMetrics(archivoMasGrande)
        : null,
      archivo_mas_pequeno: archivoMasPequeno
        ? this.formatArchivoForMetrics(archivoMasPequeno)
        : null,
      tipos_archivo: tiposConPorcentaje,
      archivos_recientes: this.formatArchivosForMetrics(archivosRecientes),
    };
  }

  /**
   * Calcular tendencia de archivos por días
   */
  async calculateTendenciaArchivos(
    empresaId: number,
    dias: number = 30,
  ): Promise<TendenciaArchivos[]> {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    const archivos = await this.prisma.archivoMultimedia.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
        fecha_subida: {
          gte: fechaInicio,
        },
      },
      select: {
        fecha_subida: true,
        tamanio_bytes: true,
      },
    });

    // Agrupar por fecha
    const archivosPorFecha = new Map<
      string,
      { cantidad: number; tamanio: number }
    >();

    archivos.forEach((archivo) => {
      const fecha = archivo.fecha_subida.toISOString().split('T')[0];
      const existing = archivosPorFecha.get(fecha) || {
        cantidad: 0,
        tamanio: 0,
      };
      archivosPorFecha.set(fecha, {
        cantidad: existing.cantidad + 1,
        tamanio: existing.tamanio + archivo.tamanio_bytes,
      });
    });

    // Generar array con todas las fechas (incluyendo días sin archivos)
    const tendencia: TendenciaArchivos[] = [];
    for (let i = 0; i < dias; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];

      const datos = archivosPorFecha.get(fechaStr) || {
        cantidad: 0,
        tamanio: 0,
      };

      tendencia.unshift({
        fecha: fechaStr,
        archivos_subidos: datos.cantidad,
        tamanio_total_bytes: datos.tamanio,
        tamanio_total_mb:
          Math.round((datos.tamanio / (1024 * 1024)) * 100) / 100,
      });
    }

    return tendencia;
  }

  /**
   * Calcular análisis de uso de archivos
   */
  async calculateAnalisisUso(empresaId: number): Promise<AnalisisUso> {
    // Obtener categorías más usadas
    const categoriasMasUsadas = await this.prisma.archivoMultimedia.groupBy({
      by: ['categoria_id'],
      where: {
        empresa_id: empresaId,
        activo: true,
        categoria_id: { not: null },
      },
      _count: {
        id_archivo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
      orderBy: {
        _count: {
          id_archivo: 'desc',
        },
      },
      take: 10,
    });

    // Obtener nombres de categorías
    const categoriaIds = categoriasMasUsadas
      .map((item) => item.categoria_id)
      .filter(Boolean);
    const categorias = await this.prisma.categoriaArchivo.findMany({
      where: {
        id_categoria_archivo: { in: categoriaIds as number[] },
      },
    });

    const categoriaMap = new Map(
      categorias.map((cat) => [cat.id_categoria_archivo, cat.nombre]),
    );

    // Obtener usuarios más activos
    const usuariosMasActivos = await this.prisma.archivoMultimedia.groupBy({
      by: ['usuario_id'],
      where: {
        empresa_id: empresaId,
        activo: true,
        usuario_id: { not: null },
      },
      _count: {
        id_archivo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
      orderBy: {
        _count: {
          id_archivo: 'desc',
        },
      },
      take: 10,
    });

    // Obtener información de usuarios
    const usuarioIds = usuariosMasActivos
      .map((item) => item.usuario_id)
      .filter(Boolean);
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        id_usuario: { in: usuarioIds as number[] },
      },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
      },
    });

    const usuarioMap = new Map(usuarios.map((user) => [user.id_usuario, user]));

    // Obtener archivos sin uso (sin versiones recientes)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 6); // 6 meses sin actividad

    const archivosSinUso = await this.prisma.archivoMultimedia.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
        fecha_subida: {
          lt: fechaLimite,
        },
        versiones: {
          none: {
            fecha_version: {
              gte: fechaLimite,
            },
          },
        },
      },
      take: 20,
      include: {
        categoria: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return {
      archivos_mas_descargados: [], // Requeriría tabla de descargas
      archivos_sin_uso: this.formatArchivosForMetrics(archivosSinUso),
      categorias_mas_usadas: categoriasMasUsadas.map((item) => ({
        categoria: categoriaMap.get(item.categoria_id!) || 'Sin categoría',
        cantidad_archivos: item._count.id_archivo,
        tamanio_total_bytes: item._sum.tamanio_bytes || 0,
      })),
      usuarios_mas_activos: usuariosMasActivos.map((item) => {
        const usuario = usuarioMap.get(item.usuario_id!);
        return {
          usuario_id: item.usuario_id!,
          nombre: usuario?.nombre || 'Usuario desconocido',
          email: usuario?.email || '',
          archivos_subidos: item._count.id_archivo,
          tamanio_total_bytes: item._sum.tamanio_bytes || 0,
        };
      }),
    };
  }

  /**
   * Calcular reporte de almacenamiento
   */
  async calculateReporteAlmacenamiento(
    empresaId: number,
  ): Promise<ReporteAlmacenamiento> {
    // Obtener uso actual
    const usoActual = await this.prisma.archivoMultimedia.aggregate({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _sum: {
        tamanio_bytes: true,
      },
    });

    const usoActualBytes = usoActual._sum.tamanio_bytes || 0;
    const limiteBytes = 10 * 1024 * 1024 * 1024; // 10GB por defecto

    // Calcular tendencia de crecimiento (últimos 30 días)
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 30);

    const crecimiento = await this.prisma.archivoMultimedia.aggregate({
      where: {
        empresa_id: empresaId,
        activo: true,
        fecha_subida: {
          gte: fechaInicio,
        },
      },
      _sum: {
        tamanio_bytes: true,
      },
    });

    const crecimientoBytes = crecimiento._sum.tamanio_bytes || 0;
    const crecimientoDiario = crecimientoBytes / 30;

    // Proyección de agotamiento
    const espacioDisponible = limiteBytes - usoActualBytes;
    let proyeccionAgotamiento: number | undefined;

    if (crecimientoDiario > 0 && espacioDisponible > 0) {
      proyeccionAgotamiento = Math.ceil(espacioDisponible / crecimientoDiario);
    }

    return {
      limite_almacenamiento_bytes: limiteBytes,
      limite_almacenamiento_mb: Math.round(limiteBytes / (1024 * 1024)),
      uso_actual_bytes: usoActualBytes,
      uso_actual_mb: Math.round((usoActualBytes / (1024 * 1024)) * 100) / 100,
      porcentaje_uso:
        Math.round((usoActualBytes / limiteBytes) * 100 * 100) / 100,
      espacio_disponible_bytes: espacioDisponible,
      espacio_disponible_mb:
        Math.round((espacioDisponible / (1024 * 1024)) * 100) / 100,
      proyeccion_agotamiento_dias: proyeccionAgotamiento,
    };
  }

  /**
   * Obtener archivos duplicados
   */
  async getArchivosDuplicados(empresaId: number): Promise<{
    grupos_duplicados: {
      hash: string;
      archivos: ArchivoFormatted[];
      tamanio_total_desperdiciado: number;
    }[];
    total_espacio_desperdiciado: number;
  }> {
    // Esta funcionalidad requeriría un campo hash en la tabla de archivos
    // Por ahora, buscaremos por nombre y tamaño
    const duplicados = await this.prisma.archivoMultimedia.groupBy({
      by: ['nombre_archivo', 'tamanio_bytes'],
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      _count: {
        id_archivo: true,
      },
      having: {
        id_archivo: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    const gruposDuplicados: {
      hash: string;
      archivos: ArchivoFormatted[];
      tamanio_total_desperdiciado: number;
    }[] = [];
    let totalEspacioDesperdiciado = 0;

    for (const duplicado of duplicados) {
      const archivos = await this.prisma.archivoMultimedia.findMany({
        where: {
          empresa_id: empresaId,
          activo: true,
          nombre_archivo: duplicado.nombre_archivo,
          tamanio_bytes: duplicado.tamanio_bytes,
        },
        include: {
          categoria: true,
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true,
            },
          },
        },
      });

      const espacioDesperdiciado =
        duplicado.tamanio_bytes * (duplicado._count.id_archivo - 1);
      totalEspacioDesperdiciado += espacioDesperdiciado;

      gruposDuplicados.push({
        hash: `${duplicado.nombre_archivo}_${duplicado.tamanio_bytes}`,
        archivos: this.formatArchivosForMetrics(archivos),
        tamanio_total_desperdiciado: espacioDesperdiciado,
      });
    }

    return {
      grupos_duplicados: gruposDuplicados,
      total_espacio_desperdiciado: totalEspacioDesperdiciado,
    };
  }

  /**
   * Formatear archivo para métricas
   */
  private formatArchivoForMetrics(archivo: any): ArchivoFormatted {
    return {
      id_archivo: archivo.id_archivo,
      nombre_archivo: archivo.nombre_archivo,
      tipo_archivo: archivo.tipo_archivo,
      mime_type: archivo.mime_type,
      url_archivo: archivo.url_archivo,
      tamanio_bytes: archivo.tamanio_bytes,
      dimensiones: archivo.dimensiones,
      metadata: archivo.metadata,
      fecha_subida: archivo.fecha_subida,
      activo: archivo.activo,
      usuario_id: archivo.usuario_id,
      empresa_id: archivo.empresa_id,
      producto_id: archivo.producto_id,
      documento_id: archivo.documento_id,
      categoria_id: archivo.categoria_id,
      categoria: archivo.categoria,
      usuario: archivo.usuario,
      versiones_count: archivo.versiones?.length || 0,
      ultima_version: archivo.versiones?.[0]?.numero_version || 0,
      createdAt: archivo.createdAt,
      updatedAt: archivo.updatedAt,
    };
  }

  /**
   * Formatear lista de archivos para métricas
   */
  private formatArchivosForMetrics(archivos: any[]): ArchivoFormatted[] {
    return archivos.map((archivo) => this.formatArchivoForMetrics(archivo));
  }
}
