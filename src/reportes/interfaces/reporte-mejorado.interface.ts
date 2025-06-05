import { Decimal } from '@prisma/client/runtime/library';

// ========================================
// INTERFACES BASE PARA REPORTES MEJORADOS
// ========================================

export interface IReporteBaseMejorado {
  id_reporte: number;
  nombre: string;
  descripcion?: string;
  tipo_reporte: string;
  formato: string;
  activo: boolean;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  ultima_ejecucion?: Date;
  id_empresa: number;
  id_usuario: number;
}

export interface IConfiguracionPeruana {
  moneda: 'PEN' | 'USD';
  zona_horaria: string;
  formato_fecha: string;
  igv_rate: number;
  decimales_moneda: number;
  incluir_igv: boolean;
  idioma: 'es' | 'en';
}

export interface IMetadataPaginacion {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IReporteResponse<T> {
  data: T[];
  metadata: IMetadataPaginacion;
  metricas?: any;
  configuracion?: IConfiguracionPeruana;
  fecha_generacion: Date;
  tiempo_ejecucion_ms?: number;
}

// ========================================
// INTERFACES ESPECÍFICAS POR TIPO DE REPORTE
// ========================================

// Interfaces para Reporte de Ventas
export interface IVentaReporte {
  id_orden_venta: number;
  numero_orden?: string;
  fecha_emision: Date;
  fecha_entrega?: Date;
  subtotal: Decimal;
  descuento: Decimal;
  igv: Decimal;
  total: Decimal;
  estado: string;
  notas?: string;
  cliente: IClienteVenta;
  items: IItemVenta[];
  factura?: IFacturaVenta;
  // Campos formateados para contexto peruano
  total_formateado?: string;
  subtotal_formateado?: string;
  igv_formateado?: string;
  fecha_emision_formateada?: string;
  fecha_entrega_formateada?: string;
}

export interface IClienteVenta {
  id_cliente: number;
  nombre: string;
  email?: string;
  telefono?: string;
  tipo_cliente: string;
  documento?: string;
  tipo_documento?: string;
}

export interface IItemVenta {
  id_item: number;
  cantidad: number;
  precio_unitario: Decimal;
  descuento: Decimal;
  subtotal: Decimal;
  producto: IProductoVenta;
  precio_unitario_formateado?: string;
  subtotal_formateado?: string;
}

export interface IProductoVenta {
  id_producto: number;
  nombre: string;
  codigo?: string;
  categoria?: {
    nombre: string;
  };
  subcategoria?: {
    nombre: string;
  };
}

export interface IFacturaVenta {
  id_factura: number;
  numero_factura: string;
  fecha_emision: Date;
  estado: string;
  total: Decimal;
}

export interface IMetricasVentasPeruanas {
  // Métricas monetarias en soles
  totalVentas: Decimal;
  totalVentasSinIGV: Decimal;
  igvTotal: Decimal;
  ticketPromedio: Decimal;

  // Métricas de cantidad
  cantidadOrdenes: number;
  cantidadProductos: number;
  cantidadClientes: number;

  // Métricas de crecimiento
  crecimientoVentas: Decimal; // Porcentaje
  crecimientoOrdenes: Decimal; // Porcentaje

  // Análisis temporal
  ventasPorPeriodo: IVentasPorPeriodo[];

  // Top rankings
  topProductos: ITopProductoVentas[];
  topClientes: ITopClienteVentas[];
  topCategorias: ITopCategoriaVentas[];

  // Métricas específicas peruanas
  porcentajeIGV: Decimal;
  ventasContado: Decimal;
  ventasCredito: Decimal;

  // Campos formateados
  totalVentas_formateado?: string;
  totalVentasSinIGV_formateado?: string;
  igvTotal_formateado?: string;
  ticketPromedio_formateado?: string;
}

export interface IVentasPorPeriodo {
  periodo: string; // 'YYYY-MM-DD' o 'YYYY-MM' o 'YYYY-WW'
  total: Decimal;
  cantidad: number;
  total_formateado?: string;
}

export interface ITopProductoVentas {
  id_producto: number;
  nombre: string;
  categoria?: string;
  cantidad_vendida: number;
  total_ventas: Decimal;
  porcentaje_total: Decimal;
  total_ventas_formateado?: string;
}

export interface ITopClienteVentas {
  id_cliente: number;
  nombre: string;
  tipo_cliente: string;
  cantidad_ordenes: number;
  total_compras: Decimal;
  ticket_promedio: Decimal;
  porcentaje_total: Decimal;
  total_compras_formateado?: string;
  ticket_promedio_formateado?: string;
}

export interface ITopCategoriaVentas {
  categoria: string;
  cantidad_productos: number;
  total_ventas: Decimal;
  porcentaje_total: Decimal;
  total_ventas_formateado?: string;
}

// Interfaces para Reporte de Compras
export interface ICompraReporte {
  id_orden_compra: number;
  numero_orden: string;
  fecha_emision: Date;
  fecha_entrega?: Date;
  subtotal: Decimal;
  igv: Decimal;
  total: Decimal;
  estado: string;
  notas?: string;
  proveedor: IProveedorCompra;
  items: IItemCompra[];
  facturas: IFacturaCompra[];
  // Campos formateados
  total_formateado?: string;
  subtotal_formateado?: string;
  igv_formateado?: string;
  fecha_emision_formateada?: string;
}

export interface IProveedorCompra {
  id_proveedor: number;
  nombre: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto_principal?: string;
}

export interface IItemCompra {
  id_item: number;
  cantidad: number;
  precio_unitario: Decimal;
  subtotal: Decimal;
  fecha_entrega?: Date;
  estado: string;
  producto: IProductoCompra;
  precio_unitario_formateado?: string;
  subtotal_formateado?: string;
}

export interface IProductoCompra {
  id_producto: number;
  nombre: string;
  codigo?: string;
  categoria?: {
    nombre: string;
  };
}

export interface IFacturaCompra {
  id_factura_compra: number;
  numero_factura: string;
  fecha_emision: Date;
  total: Decimal;
  estado: string;
}

export interface IMetricasComprasPeruanas {
  totalCompras: Decimal;
  totalComprasSinIGV: Decimal;
  igvTotal: Decimal;
  costoPromedio: Decimal;
  cantidadOrdenes: number;
  cantidadProveedores: number;
  crecimientoCompras: Decimal;
  comprasPorPeriodo: IComprasPorPeriodo[];
  topProveedores: ITopProveedorCompras[];
  topProductos: ITopProductoCompras[];
  // Campos formateados
  totalCompras_formateado?: string;
  totalComprasSinIGV_formateado?: string;
  igvTotal_formateado?: string;
  costoPromedio_formateado?: string;
}

export interface IComprasPorPeriodo {
  periodo: string;
  total: Decimal;
  cantidad: number;
  total_formateado?: string;
}

export interface ITopProveedorCompras {
  id_proveedor: number;
  nombre: string;
  ruc: string;
  cantidad_ordenes: number;
  total_compras: Decimal;
  porcentaje_total: Decimal;
  total_compras_formateado?: string;
}

export interface ITopProductoCompras {
  id_producto: number;
  nombre: string;
  categoria?: string;
  cantidad_comprada: number;
  total_compras: Decimal;
  porcentaje_total: Decimal;
  total_compras_formateado?: string;
}

// Interfaces para Reporte de Inventario
export interface IInventarioReporte {
  id_producto: number;
  nombre: string;
  codigo?: string;
  precio: Decimal;
  es_servicio: boolean;
  categoria: ICategoriaInventario;
  subcategoria?: ISubcategoriaInventario;
  stock?: IStockInventario;
  valoracion_promedio?: Decimal;
  estado_stock: 'NORMAL' | 'BAJO' | 'CRITICO' | 'AGOTADO';
  valor_inventario: Decimal;
  // Campos formateados
  precio_formateado?: string;
  valor_inventario_formateado?: string;
}

export interface ICategoriaInventario {
  id_categoria: number;
  nombre: string;
}

export interface ISubcategoriaInventario {
  id_subcategoria: number;
  nombre: string;
}

export interface IStockInventario {
  cantidad: number;
  umbral_minimo?: number;
  umbral_maximo?: number;
  fecha_ultima_actualizacion?: Date;
}

export interface IMetricasInventarioPeruanas {
  valorTotalInventario: Decimal;
  cantidadProductos: number;
  productosStockBajo: number;
  productosStockCritico: number;
  productosAgotados: number;
  rotacionPromedio: Decimal;
  valorPorCategoria: IValorPorCategoria[];
  productosTopValor: IProductoTopValor[];
  alertasStock: IAlertaStock[];
  // Campos formateados
  valorTotalInventario_formateado?: string;
}

export interface IValorPorCategoria {
  categoria: string;
  cantidad_productos: number;
  valor_total: Decimal;
  porcentaje_total: Decimal;
  valor_total_formateado?: string;
}

export interface IProductoTopValor {
  id_producto: number;
  nombre: string;
  categoria: string;
  stock: number;
  precio: Decimal;
  valor_total: Decimal;
  valor_total_formateado?: string;
  precio_formateado?: string;
}

export interface IAlertaStock {
  id_producto: number;
  nombre: string;
  stock_actual: number;
  umbral_minimo: number;
  categoria: string;
  nivel_alerta: 'BAJO' | 'CRITICO' | 'AGOTADO';
  dias_estimados_agotamiento?: number;
}

// Interfaces para Reporte de Clientes
export interface IClienteReporte {
  id_cliente: number;
  nombre: string;
  email?: string;
  telefono?: string;
  tipo_cliente: string;
  documento?: string;
  tipo_documento?: string;
  fecha_registro: Date;
  estado_cliente: 'ACTIVO' | 'INACTIVO' | 'NUEVO';
  metricas_cliente: IMetricasCliente;
  compras?: ICompraCliente[];
  valoraciones?: IValoracionCliente[];
}

export interface IMetricasCliente {
  total_compras: Decimal;
  cantidad_ordenes: number;
  ticket_promedio: Decimal;
  frecuencia_compra: number; // días promedio entre compras
  ultima_compra?: Date;
  primera_compra?: Date;
  valor_lifetime: Decimal;
  // Campos formateados
  total_compras_formateado?: string;
  ticket_promedio_formateado?: string;
  valor_lifetime_formateado?: string;
}

export interface ICompraCliente {
  id_orden_venta: number;
  fecha_emision: Date;
  total: Decimal;
  estado: string;
  cantidad_productos: number;
}

export interface IValoracionCliente {
  id_valoracion: number;
  puntuacion: number;
  comentario?: string;
  fecha_valoracion: Date;
  producto: string;
}

export interface IMetricasClientesPeruanas {
  totalClientes: number;
  clientesActivos: number;
  clientesNuevos: number;
  clientesInactivos: number;
  valorPromedioCliente: Decimal;
  frecuenciaCompraPromedio: Decimal;
  retencionClientes: Decimal; // Porcentaje
  clientesPorTipo: IClientesPorTipo[];
  topClientesPorValor: ITopClienteValor[];
  segmentacionClientes: ISegmentacionClientes;
  // Campos formateados
  valorPromedioCliente_formateado?: string;
}

export interface IClientesPorTipo {
  tipo: string;
  cantidad: number;
  porcentaje: Decimal;
  valor_promedio: Decimal;
  valor_promedio_formateado?: string;
}

export interface ITopClienteValor {
  id_cliente: number;
  nombre: string;
  tipo_cliente: string;
  total_compras: Decimal;
  cantidad_ordenes: number;
  ticket_promedio: Decimal;
  ultima_compra: Date;
  total_compras_formateado?: string;
  ticket_promedio_formateado?: string;
}

export interface ISegmentacionClientes {
  vip: number; // Clientes con compras > umbral VIP
  frecuentes: number; // Clientes con > X compras
  nuevos: number; // Clientes registrados en período
  en_riesgo: number; // Clientes sin compras recientes
}

// Interfaces para Reporte de Productos
export interface IProductoReporte {
  id_producto: number;
  nombre: string;
  codigo?: string;
  precio: Decimal;
  es_servicio: boolean;
  categoria: ICategoriaProducto;
  subcategoria?: ISubcategoriaProducto;
  stock?: IStockProducto;
  metricas_producto: IMetricasProducto;
  valoraciones?: IValoracionProducto[];
  estado_producto: 'ACTIVO' | 'INACTIVO' | 'DESCONTINUADO';
}

export interface ICategoriaProducto {
  id_categoria: number;
  nombre: string;
}

export interface ISubcategoriaProducto {
  id_subcategoria: number;
  nombre: string;
}

export interface IStockProducto {
  cantidad: number;
  disponible: number;
  reservado: number;
  umbral_minimo?: number;
}

export interface IMetricasProducto {
  total_ventas: Decimal;
  cantidad_vendida: number;
  margen_bruto: Decimal;
  margen_porcentaje: Decimal;
  rotacion: Decimal;
  valoracion_promedio?: Decimal;
  cantidad_valoraciones: number;
  ultima_venta?: Date;
  // Campos formateados
  total_ventas_formateado?: string;
  margen_bruto_formateado?: string;
}

export interface IValoracionProducto {
  puntuacion: number;
  comentario?: string;
  fecha_valoracion: Date;
  cliente: string;
}

export interface IMetricasProductosPeruanas {
  totalProductos: number;
  productosActivos: number;
  productosInactivos: number;
  ventasTotales: Decimal;
  margenPromedio: Decimal;
  rotacionPromedio: Decimal;
  valoracionPromedio: Decimal;
  topProductosVentas: ITopProductoVentasDetalle[];
  topProductosMargen: ITopProductoMargen[];
  productosPorCategoria: IProductosPorCategoria[];
  alertasProductos: IAlertaProducto[];
  // Campos formateados
  ventasTotales_formateado?: string;
  margenPromedio_formateado?: string;
}

export interface ITopProductoVentasDetalle {
  id_producto: number;
  nombre: string;
  categoria: string;
  total_ventas: Decimal;
  cantidad_vendida: number;
  margen: Decimal;
  valoracion: Decimal;
  total_ventas_formateado?: string;
  margen_formateado?: string;
}

export interface ITopProductoMargen {
  id_producto: number;
  nombre: string;
  categoria: string;
  margen_bruto: Decimal;
  margen_porcentaje: Decimal;
  total_ventas: Decimal;
  margen_bruto_formateado?: string;
  total_ventas_formateado?: string;
}

export interface IProductosPorCategoria {
  categoria: string;
  cantidad_productos: number;
  productos_activos: number;
  total_ventas: Decimal;
  margen_promedio: Decimal;
  total_ventas_formateado?: string;
  margen_promedio_formateado?: string;
}

export interface IAlertaProducto {
  id_producto: number;
  nombre: string;
  tipo_alerta: 'STOCK_BAJO' | 'SIN_VENTAS' | 'MARGEN_BAJO' | 'VALORACION_BAJA';
  descripcion: string;
  valor_actual: string;
  valor_recomendado?: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
}

// Interfaces para Reporte Financiero
export interface IFinancieroReporte {
  transacciones: ITransaccionFinanciera[];
  resumen_periodo: IResumenFinanciero;
  flujo_efectivo: IFlujoEfectivo[];
  indicadores: IIndicadoresFinancieros;
  proyecciones?: IProyeccionFinanciera[];
}

export interface ITransaccionFinanciera {
  id_transaccion: number;
  tipo: 'VENTA' | 'COMPRA' | 'GASTO' | 'INGRESO';
  fecha: Date;
  descripcion: string;
  subtotal: Decimal;
  igv: Decimal;
  total: Decimal;
  estado: string;
  contraparte: string; // Cliente o Proveedor
  categoria?: string;
  // Campos formateados
  subtotal_formateado?: string;
  igv_formateado?: string;
  total_formateado?: string;
  fecha_formateada?: string;
}

export interface IResumenFinanciero {
  ingresos_totales: Decimal;
  costos_totales: Decimal;
  utilidad_bruta: Decimal;
  margen_bruto: Decimal;
  igv_recaudado: Decimal;
  igv_pagado: Decimal;
  igv_neto: Decimal;
  flujo_efectivo_neto: Decimal;
  // Campos formateados
  ingresos_totales_formateado?: string;
  costos_totales_formateado?: string;
  utilidad_bruta_formateado?: string;
  igv_recaudado_formateado?: string;
  igv_pagado_formateado?: string;
  flujo_efectivo_neto_formateado?: string;
}

export interface IFlujoEfectivo {
  periodo: string;
  ingresos: Decimal;
  egresos: Decimal;
  flujo_neto: Decimal;
  flujo_acumulado: Decimal;
  // Campos formateados
  ingresos_formateado?: string;
  egresos_formateado?: string;
  flujo_neto_formateado?: string;
  flujo_acumulado_formateado?: string;
}

export interface IIndicadoresFinancieros {
  liquidez: Decimal;
  rentabilidad: Decimal;
  endeudamiento: Decimal;
  rotacion_activos: Decimal;
  margen_operativo: Decimal;
  punto_equilibrio: Decimal;
  // Campos formateados
  punto_equilibrio_formateado?: string;
}

export interface IProyeccionFinanciera {
  periodo: string;
  ingresos_proyectados: Decimal;
  costos_proyectados: Decimal;
  utilidad_proyectada: Decimal;
  confianza: Decimal; // Porcentaje de confianza
  // Campos formateados
  ingresos_proyectados_formateado?: string;
  costos_proyectados_formateado?: string;
  utilidad_proyectada_formateado?: string;
}

// ========================================
// INTERFACES PARA EJECUCIÓN DE REPORTES
// ========================================

export interface IEjecucionReporteMejorada {
  id_ejecucion: number;
  id_reporte: number;
  id_usuario: number;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR' | 'CANCELADO';
  fecha_inicio: Date;
  fecha_fin?: Date;
  tiempo_ejecucion_ms?: number;
  parametros_utilizados?: any;
  resultado_resumen?: any;
  error_detalle?: string;
  tamaño_resultado_kb?: number;
  registros_procesados?: number;
}

export interface IConfiguracionReporteMejorada {
  formato_salida: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  incluir_graficos: boolean;
  incluir_metricas: boolean;
  incluir_configuracion: boolean;
  compresion: boolean;
  marca_agua: boolean;
  encabezado_personalizado?: string;
  pie_pagina_personalizado?: string;
  logo_empresa?: string;
  configuracion_peruana: IConfiguracionPeruana;
}

// ========================================
// TIPOS UTILITARIOS
// ========================================

export type TipoReporteMejorado =
  | 'VENTAS'
  | 'COMPRAS'
  | 'INVENTARIO'
  | 'CLIENTES'
  | 'PRODUCTOS'
  | 'FINANCIERO'
  | 'DASHBOARD'
  | 'AUDITORIA';

export type EstadoReporte =
  | 'ACTIVO'
  | 'INACTIVO'
  | 'PROGRAMADO'
  | 'EJECUTANDO'
  | 'ERROR';

export type FormatoReporteMejorado = 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'HTML';

export type PeriodoAgrupacion = 'DIA' | 'SEMANA' | 'MES' | 'TRIMESTRE' | 'AÑO';

export type NivelAlerta = 'INFO' | 'ADVERTENCIA' | 'ERROR' | 'CRITICO';
