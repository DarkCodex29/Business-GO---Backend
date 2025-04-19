export interface IReporte {
  id_reporte: number;
  nombre: string;
  descripcion?: string;
  tipo_reporte: string;
  parametros?: Record<string, any>;
  formato: string;
  programacion?: Record<string, any>;
  ultima_ejecucion?: Date;
  activo: boolean;
  id_empresa: number;
  id_usuario: number;
}

export interface IReporteVentas {
  fecha_inicio: Date;
  fecha_fin: Date;
  agrupar_por?: 'dia' | 'semana' | 'mes' | 'producto' | 'cliente';
  incluir_detalles?: boolean;
}

export interface IReporteCompras {
  fecha_inicio: Date;
  fecha_fin: Date;
  agrupar_por?: 'dia' | 'semana' | 'mes' | 'producto' | 'proveedor';
  incluir_detalles?: boolean;
}

export interface IReporteInventario {
  incluir_bajos?: boolean;
  umbral_minimo?: number;
  agrupar_por?: 'categoria' | 'subcategoria' | 'proveedor';
  incluir_movimientos?: boolean;
}

export interface IReporteClientes {
  fecha_inicio?: Date;
  fecha_fin?: Date;
  tipo_cliente?: string;
  incluir_compras?: boolean;
  incluir_valoraciones?: boolean;
}

export interface IReporteProductos {
  categoria_id?: number;
  subcategoria_id?: number;
  incluir_stock?: boolean;
  incluir_ventas?: boolean;
  incluir_valoraciones?: boolean;
}

export interface IReporteFinanciero {
  fecha_inicio: Date;
  fecha_fin: Date;
  tipo?: 'ventas' | 'compras' | 'general';
  incluir_impuestos?: boolean;
  incluir_detalles?: boolean;
}
