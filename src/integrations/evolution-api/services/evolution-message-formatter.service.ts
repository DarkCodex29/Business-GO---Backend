import { Injectable } from '@nestjs/common';

interface BusinessQueryResult {
  tipo: 'stock' | 'trabajadores' | 'ventas' | 'resumen' | 'error';
  datos: any;
  mensaje: string;
}

@Injectable()
export class EvolutionMessageFormatterService {
  /**
   * Formatea un resultado de consulta de stock para WhatsApp
   */
  formatearStock(result: BusinessQueryResult): string {
    if (result.tipo === 'error') {
      return `❌ *Error de Inventario*\n\n${result.mensaje}\n\nIntenta nuevamente o contacta soporte.`;
    }

    const datos = result.datos;
    let mensaje = `📦 *INVENTARIO ACTUAL*\n\n`;

    // Resumen general
    mensaje += `📊 *Resumen:*\n`;
    mensaje += `• Total productos: ${datos.total_productos}\n`;
    mensaje += `• Con stock: ${datos.con_stock}\n`;
    mensaje += `• Sin stock: ${datos.sin_stock}\n`;
    mensaje += `• Stock bajo: ${datos.stock_bajo}\n\n`;

    // Productos críticos (stock bajo)
    if (datos.productos_criticos.length > 0) {
      mensaje += `⚠️ *PRODUCTOS CON STOCK BAJO:*\n`;
      datos.productos_criticos.slice(0, 5).forEach((producto) => {
        mensaje += `• ${producto.nombre}\n`;
        mensaje += `  Stock: ${producto.stock_actual}/${producto.stock_minimo} mín\n`;
        mensaje += `  Precio: S/ ${producto.precio_venta}\n\n`;
      });
    }

    // Productos principales
    if (datos.productos.length > 0) {
      mensaje += `📋 *PRODUCTOS PRINCIPALES:*\n`;
      datos.productos.slice(0, 8).forEach((producto) => {
        const stockIcon =
          producto.stock_actual === 0
            ? '🔴'
            : producto.stock_actual <= producto.stock_minimo
              ? '🟡'
              : '🟢';

        mensaje += `${stockIcon} *${producto.nombre}*\n`;
        mensaje += `   Stock: ${producto.stock_actual} unidades\n`;
        mensaje += `   Precio: S/ ${producto.precio_venta}\n`;
        if (producto.categoria?.nombre) {
          mensaje += `   Categoría: ${producto.categoria.nombre}\n`;
        }
        mensaje += `\n`;
      });
    }

    if (datos.productos.length > 8) {
      mensaje += `... y ${datos.productos.length - 8} productos más\n\n`;
    }

    mensaje += `🕐 Consulta realizada: ${new Date().toLocaleString('es-PE')}\n\n`;
    mensaje += `💡 *Comandos disponibles:*\n`;
    mensaje += `• "stock [producto]" - Buscar producto específico\n`;
    mensaje += `• "trabajadores" - Ver empleados\n`;
    mensaje += `• "ventas" - Resumen de ventas\n`;
    mensaje += `• "resumen" - Dashboard general`;

    return mensaje;
  }

  /**
   * Formatea un resultado de consulta de trabajadores para WhatsApp
   */
  formatearTrabajadores(result: BusinessQueryResult): string {
    if (result.tipo === 'error') {
      return `❌ *Error de Personal*\n\n${result.mensaje}\n\nIntenta nuevamente o contacta soporte.`;
    }

    const datos = result.datos;
    let mensaje = `👥 *PERSONAL DE LA EMPRESA*\n\n`;

    // Resumen general
    mensaje += `📊 *Resumen:*\n`;
    mensaje += `• Total trabajadores: ${datos.total_trabajadores}\n`;
    mensaje += `• Activos recientes: ${datos.activos_recientes}\n`;
    mensaje += `• Dueños: ${datos.duenos}\n`;
    mensaje += `• Empleados: ${datos.empleados}\n\n`;

    // Distribución por departamentos
    if (Object.keys(datos.departamentos).length > 0) {
      mensaje += `🏢 *Por Departamento:*\n`;
      Object.entries(datos.departamentos)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .forEach(([dept, cantidad]) => {
          mensaje += `• ${dept}: ${cantidad} personas\n`;
        });
      mensaje += `\n`;
    }

    // Lista de trabajadores
    if (datos.trabajadores.length > 0) {
      mensaje += `👨‍💼 *EQUIPO DE TRABAJO:*\n`;
      datos.trabajadores.slice(0, 10).forEach((trabajador) => {
        const rolIcon = trabajador.es_dueno ? '👑' : '👨‍💼';
        const statusIcon =
          trabajador.ultimo_acceso &&
          new Date().getTime() - new Date(trabajador.ultimo_acceso).getTime() <
            7 * 24 * 60 * 60 * 1000
            ? '🟢'
            : '🔴';

        mensaje += `${rolIcon} *${trabajador.nombre}* ${statusIcon}\n`;
        if (trabajador.cargo) {
          mensaje += `   Cargo: ${trabajador.cargo}\n`;
        }
        if (trabajador.departamento) {
          mensaje += `   Área: ${trabajador.departamento}\n`;
        }
        if (trabajador.salario && trabajador.es_dueno === false) {
          mensaje += `   Salario: S/ ${trabajador.salario}\n`;
        }
        const fechaInicio = new Date(trabajador.fecha_inicio);
        mensaje += `   Desde: ${fechaInicio.toLocaleDateString('es-PE')}\n`;

        if (trabajador.ultimo_acceso) {
          const ultimoAcceso = new Date(trabajador.ultimo_acceso);
          mensaje += `   Último acceso: ${ultimoAcceso.toLocaleDateString('es-PE')}\n`;
        }
        mensaje += `\n`;
      });
    }

    if (datos.trabajadores.length > 10) {
      mensaje += `... y ${datos.trabajadores.length - 10} trabajadores más\n\n`;
    }

    mensaje += `🕐 Consulta realizada: ${new Date().toLocaleString('es-PE')}\n\n`;
    mensaje += `💡 *Comandos disponibles:*\n`;
    mensaje += `• "stock" - Ver inventario\n`;
    mensaje += `• "ventas" - Resumen de ventas\n`;
    mensaje += `• "resumen" - Dashboard general`;

    return mensaje;
  }

  /**
   * Formatea un resultado de consulta de ventas para WhatsApp
   */
  formatearVentas(result: BusinessQueryResult): string {
    if (result.tipo === 'error') {
      return `❌ *Error de Ventas*\n\n${result.mensaje}\n\nIntenta nuevamente o contacta soporte.`;
    }

    const datos = result.datos;
    let mensaje = `💰 *RESUMEN DE VENTAS*\n`;
    mensaje += `📅 Período: ${datos.periodo.toUpperCase()}\n\n`;

    // Métricas principales
    mensaje += `📊 *Métricas Generales:*\n`;
    mensaje += `• Total ventas: ${datos.total_ventas}\n`;
    mensaje += `• Ingresos: S/ ${datos.total_ingresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
    mensaje += `• Ticket promedio: S/ ${datos.ticket_promedio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;

    // Ventas por estado
    if (Object.keys(datos.ventas_por_estado).length > 0) {
      mensaje += `📋 *Por Estado:*\n`;
      Object.entries(datos.ventas_por_estado).forEach(([estado, cantidad]) => {
        const icon =
          estado === 'completada'
            ? '✅'
            : estado === 'pendiente'
              ? '⏳'
              : estado === 'cancelada'
                ? '❌'
                : '📋';
        mensaje += `${icon} ${estado.charAt(0).toUpperCase() + estado.slice(1)}: ${cantidad}\n`;
      });
      mensaje += `\n`;
    }

    // Productos más vendidos
    if (datos.productos_mas_vendidos.length > 0) {
      mensaje += `🏆 *TOP PRODUCTOS:*\n`;
      datos.productos_mas_vendidos.forEach(([producto, cantidad], index) => {
        const medal =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        mensaje += `${medal} ${producto}: ${cantidad} vendidos\n`;
      });
      mensaje += `\n`;
    }

    // Ventas recientes
    if (datos.ventas_recientes.length > 0) {
      mensaje += `🕐 *VENTAS RECIENTES:*\n`;
      datos.ventas_recientes.forEach((venta) => {
        const fecha = new Date(venta.fecha);
        const estadoIcon =
          venta.estado === 'completada'
            ? '✅'
            : venta.estado === 'pendiente'
              ? '⏳'
              : '❌';

        mensaje += `${estadoIcon} *${venta.cliente}*\n`;
        mensaje += `   S/ ${Number(venta.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
        mensaje += `   ${fecha.toLocaleDateString('es-PE')} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n\n`;
      });
    }

    mensaje += `🕐 Consulta realizada: ${new Date().toLocaleString('es-PE')}\n\n`;
    mensaje += `💡 *Comandos disponibles:*\n`;
    mensaje += `• "ventas hoy" - Ventas de hoy\n`;
    mensaje += `• "ventas semana" - Última semana\n`;
    mensaje += `• "stock" - Ver inventario\n`;
    mensaje += `• "trabajadores" - Ver personal\n`;
    mensaje += `• "resumen" - Dashboard completo`;

    return mensaje;
  }

  /**
   * Formatea un resumen general del negocio
   */
  formatearResumenGeneral(result: BusinessQueryResult): string {
    if (result.tipo === 'error') {
      return `❌ *Error en Dashboard*\n\n${result.mensaje}\n\nIntenta nuevamente o contacta soporte.`;
    }

    const datos = result.datos;
    let mensaje = `🏢 *DASHBOARD EMPRESARIAL*\n\n`;

    // Resumen de ventas
    if (datos.ventas) {
      mensaje += `💰 *VENTAS (ÚLTIMO MES):*\n`;
      mensaje += `• Total: ${datos.ventas.total_ventas} órdenes\n`;
      mensaje += `• Ingresos: S/ ${datos.ventas.total_ingresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
      mensaje += `• Promedio: S/ ${datos.ventas.ticket_promedio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
    }

    // Resumen de inventario
    if (datos.stock) {
      mensaje += `📦 *INVENTARIO:*\n`;
      mensaje += `• Productos: ${datos.stock.total_productos}\n`;
      mensaje += `• Con stock: ${datos.stock.con_stock}\n`;
      mensaje += `• Sin stock: ${datos.stock.sin_stock}\n`;
      if (datos.stock.stock_bajo > 0) {
        mensaje += `⚠️ Stock bajo: ${datos.stock.stock_bajo}\n`;
      }
      mensaje += `\n`;
    }

    // Resumen de personal
    if (datos.trabajadores) {
      mensaje += `👥 *PERSONAL:*\n`;
      mensaje += `• Total: ${datos.trabajadores.total_trabajadores}\n`;
      mensaje += `• Activos: ${datos.trabajadores.activos_recientes}\n`;
      mensaje += `• Dueños: ${datos.trabajadores.duenos}\n`;
      mensaje += `• Empleados: ${datos.trabajadores.empleados}\n\n`;
    }

    // Alertas importantes
    let alertas: string[] = [];
    if (datos.stock?.stock_bajo > 0) {
      alertas.push(`⚠️ ${datos.stock.stock_bajo} productos con stock bajo`);
    }
    if (datos.ventas?.ventas_por_estado?.pendiente > 0) {
      alertas.push(
        `⏳ ${datos.ventas.ventas_por_estado.pendiente} ventas pendientes`,
      );
    }

    if (alertas.length > 0) {
      mensaje += `🚨 *ALERTAS:*\n`;
      alertas.forEach((alerta) => (mensaje += `${alerta}\n`));
      mensaje += `\n`;
    }

    // Top productos más vendidos
    if (datos.ventas?.productos_mas_vendidos?.length > 0) {
      mensaje += `🏆 *TOP 3 PRODUCTOS:*\n`;
      datos.ventas.productos_mas_vendidos
        .slice(0, 3)
        .forEach(([producto, cantidad], index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          mensaje += `${medal} ${producto}: ${cantidad}\n`;
        });
      mensaje += `\n`;
    }

    mensaje += `🕐 Actualizado: ${new Date().toLocaleString('es-PE')}\n\n`;
    mensaje += `💡 *Consultas detalladas:*\n`;
    mensaje += `• "stock" - Inventario completo\n`;
    mensaje += `• "trabajadores" - Personal detallado\n`;
    mensaje += `• "ventas" - Análisis de ventas\n`;
    mensaje += `• "ayuda" - Lista de comandos`;

    return mensaje;
  }

  /**
   * Formatea mensaje de autenticación requerida
   */
  formatearMensajeAutenticacion(codigo: string): string {
    return (
      `🔐 *ACCESO EMPRESARIAL*\n\n` +
      `Para acceder a información de tu empresa, confirma tu identidad.\n\n` +
      `🔢 *Código de verificación:*\n` +
      `\`${codigo}\`\n\n` +
      `⏰ Válido por 10 minutos\n` +
      `🔒 Responde con este código para continuar\n\n` +
      `❌ Escribe "cancelar" para cancelar`
    );
  }

  /**
   * Formatea mensaje de selección de empresa
   */
  formatearSeleccionEmpresa(empresas: any[]): string {
    let mensaje = `🏢 *SELECCIONA TU EMPRESA*\n\n`;
    mensaje += `Tienes acceso a las siguientes empresas:\n\n`;

    empresas.forEach((empresa, index) => {
      const rolIcon = empresa.es_dueno ? '👑' : '👨‍💼';
      mensaje += `${index + 1}. ${rolIcon} *${empresa.nombre}*\n`;
      mensaje += `   Cargo: ${empresa.cargo}\n`;
      if (empresa.es_dueno) {
        mensaje += `   🔓 Acceso completo\n`;
      }
      mensaje += `\n`;
    });

    mensaje += `📝 Responde con el número de la empresa (1, 2, 3...)\n`;
    mensaje += `❌ Escribe "cancelar" para salir`;

    return mensaje;
  }

  /**
   * Formatea mensaje de ayuda para empresarios
   */
  formatearAyudaEmpresarial(): string {
    return (
      `📋 *COMANDOS EMPRESARIALES*\n\n` +
      `📊 *Consultas de Negocio:*\n` +
      `• "resumen" - Dashboard general\n` +
      `• "stock" - Inventario completo\n` +
      `• "stock [producto]" - Buscar producto\n` +
      `• "trabajadores" - Lista de personal\n` +
      `• "ventas" - Resumen de ventas (mes)\n` +
      `• "ventas hoy" - Ventas del día\n` +
      `• "ventas semana" - Última semana\n\n` +
      `🔐 *Gestión de Sesión:*\n` +
      `• "salir" - Cerrar sesión\n` +
      `• "empresa" - Cambiar empresa\n\n` +
      `💡 *Tips:*\n` +
      `• Los datos se actualizan en tiempo real\n` +
      `• Tu sesión expira en 1 hora\n` +
      `• Solo ves datos de empresas autorizadas`
    );
  }

  /**
   * Formatea mensaje de error general
   */
  formatearError(mensaje: string): string {
    return (
      `❌ *ERROR*\n\n${mensaje}\n\n` +
      `💡 Intenta:\n` +
      `• Verificar tu conexión\n` +
      `• Escribir "ayuda" para ver comandos\n` +
      `• Contactar soporte si persiste`
    );
  }
}
