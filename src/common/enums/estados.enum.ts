// ========================================
// ENUMS CENTRALIZADOS - BUSINESS GO
// ========================================
// Este archivo contiene todos los enums utilizados en el sistema
// para mantener consistencia entre el schema de Prisma y el código TypeScript

// ========================================
// ENUMS GENERALES
// ========================================

export enum EstadoGeneral {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  ELIMINADO = 'ELIMINADO',
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PROCESANDO = 'PROCESANDO',
  COMPLETADO = 'COMPLETADO',
  FALLIDO = 'FALLIDO',
  CANCELADO = 'CANCELADO',
  REEMBOLSADO = 'REEMBOLSADO',
}

export enum EstadoOrdenVenta {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  EN_PROCESO = 'EN_PROCESO',
  ENVIADA = 'ENVIADA',
  ENTREGADA = 'ENTREGADA',
  CANCELADA = 'CANCELADA',
}

export enum EstadoCotizacion {
  PENDIENTE = 'PENDIENTE',
  ENVIADA = 'ENVIADA',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
  VENCIDA = 'VENCIDA',
}

export enum EstadoFactura {
  EMITIDA = 'EMITIDA',
  PAGADA = 'PAGADA',
  VENCIDA = 'VENCIDA',
  ANULADA = 'ANULADA',
}

export enum EstadoNotaCredito {
  EMITIDA = 'EMITIDA',
  APLICADA = 'APLICADA',
  ANULADA = 'ANULADA',
}

export enum EstadoModeracion {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

export enum TipoContrato {
  INDEFINIDO = 'INDEFINIDO',
  TEMPORAL = 'TEMPORAL',
  PRACTICAS = 'PRACTICAS',
  FREELANCE = 'FREELANCE',
}

export enum TipoDocumento {
  DNI = 'DNI',
  CARNET_EXTRANJERIA = 'CARNET_EXTRANJERIA',
  PASAPORTE = 'PASAPORTE',
  RUC = 'RUC',
}

// ========================================
// ENUMS PARA FUNCIONALIDAD SAAS
// ========================================

export enum PlanSuscripcion {
  TRIAL = 'TRIAL',
  BASICO = 'BASICO',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum EstadoSuscripcion {
  TRIAL = 'TRIAL',
  ACTIVA = 'ACTIVA',
  SUSPENDIDA = 'SUSPENDIDA',
  CANCELADA = 'CANCELADA',
  VENCIDA = 'VENCIDA',
}

export enum TipoConsulta {
  COTIZACION = 'COTIZACION',
  INFORMACION = 'INFORMACION',
  SOPORTE = 'SOPORTE',
  PEDIDO = 'PEDIDO',
  RECLAMO = 'RECLAMO',
  CATALOGO = 'CATALOGO',
}

export enum EstadoConsulta {
  NUEVA = 'NUEVA',
  EN_PROCESO = 'EN_PROCESO',
  RESPONDIDA = 'RESPONDIDA',
  CERRADA = 'CERRADA',
}

// ========================================
// MAPAS DE DESCRIPCIÓN PARA UI
// ========================================

export const EstadoGeneralLabels = {
  [EstadoGeneral.ACTIVO]: 'Activo',
  [EstadoGeneral.INACTIVO]: 'Inactivo',
  [EstadoGeneral.SUSPENDIDO]: 'Suspendido',
  [EstadoGeneral.ELIMINADO]: 'Eliminado',
};

export const EstadoPagoLabels = {
  [EstadoPago.PENDIENTE]: 'Pendiente',
  [EstadoPago.PROCESANDO]: 'Procesando',
  [EstadoPago.COMPLETADO]: 'Completado',
  [EstadoPago.FALLIDO]: 'Fallido',
  [EstadoPago.CANCELADO]: 'Cancelado',
  [EstadoPago.REEMBOLSADO]: 'Reembolsado',
};

export const PlanSuscripcionLabels = {
  [PlanSuscripcion.TRIAL]: 'Prueba Gratuita',
  [PlanSuscripcion.BASICO]: 'Plan Básico',
  [PlanSuscripcion.PRO]: 'Plan Pro',
  [PlanSuscripcion.ENTERPRISE]: 'Plan Enterprise',
};

export const TipoConsultaLabels = {
  [TipoConsulta.COTIZACION]: 'Solicitud de Cotización',
  [TipoConsulta.INFORMACION]: 'Información General',
  [TipoConsulta.SOPORTE]: 'Soporte Técnico',
  [TipoConsulta.PEDIDO]: 'Realizar Pedido',
  [TipoConsulta.RECLAMO]: 'Reclamo',
  [TipoConsulta.CATALOGO]: 'Consulta de Catálogo',
};

// ========================================
// CONFIGURACIONES DE PLANES SAAS
// ========================================

export const PLANES_CONFIG = {
  [PlanSuscripcion.TRIAL]: {
    nombre: 'Prueba Gratuita',
    precio: 0,
    duracion_dias: 14,
    limite_clientes: 50,
    limite_productos: 25,
    limite_usuarios: 2,
    limite_mensajes: 500,
    caracteristicas: [
      'Gestión básica de clientes',
      'Catálogo de productos',
      'WhatsApp básico',
      'Soporte por email',
    ],
  },
  [PlanSuscripcion.BASICO]: {
    nombre: 'Plan Básico',
    precio: 99,
    duracion_dias: 30,
    limite_clientes: 200,
    limite_productos: 100,
    limite_usuarios: 5,
    limite_mensajes: 2000,
    caracteristicas: [
      'Todo lo del plan Trial',
      'Cotizaciones automáticas',
      'Reportes básicos',
      'Integración WhatsApp completa',
    ],
  },
  [PlanSuscripcion.PRO]: {
    nombre: 'Plan Pro',
    precio: 249,
    duracion_dias: 30,
    limite_clientes: 1000,
    limite_productos: 500,
    limite_usuarios: 15,
    limite_mensajes: 10000,
    caracteristicas: [
      'Todo lo del plan Básico',
      'IA para respuestas automáticas',
      'Reportes avanzados',
      'API personalizada',
      'Soporte prioritario',
    ],
  },
  [PlanSuscripcion.ENTERPRISE]: {
    nombre: 'Plan Enterprise',
    precio: 449,
    duracion_dias: 30,
    limite_clientes: -1, // Ilimitado
    limite_productos: -1, // Ilimitado
    limite_usuarios: -1, // Ilimitado
    limite_mensajes: -1, // Ilimitado
    caracteristicas: [
      'Todo lo del plan Pro',
      'Clientes ilimitados',
      'Usuarios ilimitados',
      'Soporte 24/7',
      'Implementación personalizada',
      'Capacitación incluida',
    ],
  },
};
