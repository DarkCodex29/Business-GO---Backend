import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Crear roles si no existen
  const superAdminRole = await prisma.rol.upsert({
    where: { nombre: 'SUPER_ADMIN' },
    update: {},
    create: {
      nombre: 'SUPER_ADMIN',
      descripcion: 'Rol con acceso completo al sistema',
    },
  });

  const adminRole = await prisma.rol.upsert({
    where: { nombre: 'ADMIN' },
    update: {},
    create: { nombre: 'ADMIN', descripcion: 'Administrador del sistema' },
  });

  const empresaRole = await prisma.rol.upsert({
    where: { nombre: 'EMPRESA' },
    update: {},
    create: { nombre: 'EMPRESA', descripcion: 'Usuario empresa' },
  });

  const clienteRole = await prisma.rol.upsert({
    where: { nombre: 'CLIENTE' },
    update: {},
    create: {
      nombre: 'CLIENTE',
      descripcion: 'Cliente que puede hacer compras',
    },
  });

  // Hash de las contraseñas
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const empresaPassword = await bcrypt.hash('Empresa123!', 10);
  const clientePassword = await bcrypt.hash('Cliente123!', 10);

  // Crear usuarios si no existen
  const superAdminUser = await prisma.usuario.upsert({
    where: { email: 'super.admin@businessgo.com' },
    update: {
      contrasena: superAdminPassword,
    },
    create: {
      nombre: 'Super Admin',
      email: 'super.admin@businessgo.com',
      contrasena: superAdminPassword,
      telefono: '+51952164800',
      rol_id: superAdminRole.id_rol,
    },
  });

  const adminUser = await prisma.usuario.upsert({
    where: { email: 'gian.admin@businessgo.com' },
    update: {
      contrasena: adminPassword,
    },
    create: {
      nombre: 'Gian Admin',
      email: 'gian.admin@businessgo.com',
      contrasena: adminPassword,
      telefono: '+51952164832',
      rol_id: adminRole.id_rol,
    },
  });

  const empresaUser = await prisma.usuario.upsert({
    where: { email: 'gian.empresa@businessgo.com' },
    update: {
      contrasena: empresaPassword,
    },
    create: {
      nombre: 'Gian Empresa',
      email: 'gian.empresa@businessgo.com',
      contrasena: empresaPassword,
      telefono: '+51952164832',
      rol_id: empresaRole.id_rol,
    },
  });

  const clienteUser = await prisma.usuario.upsert({
    where: { email: 'gian.cliente@businessgo.com' },
    update: {
      contrasena: clientePassword,
    },
    create: {
      nombre: 'Gian Cliente',
      email: 'gian.cliente@businessgo.com',
      contrasena: clientePassword,
      telefono: '+51952164832',
      rol_id: clienteRole.id_rol,
    },
  });

  // Crear empresas
  const empresaDemo = await prisma.empresa.upsert({
    where: { ruc: '20601245784' },
    update: {},
    create: {
      nombre: 'Business Demo SAC',
      razon_social: 'Business Demo Sociedad Anónima Cerrada',
      nombre_comercial: 'BusinessGo',
      ruc: '20601245784',
      telefono: '+51952164832',
      tipo_empresa: 'Servicios',
      tipo_contribuyente: 'MYPE',
      latitud: -12.0464,
      longitud: -77.0428,
      logo: 'https://via.placeholder.com/150',
      sitio_web: 'https://businessgo.com',
      redes_sociales: {
        facebook: 'businessgodemo',
        instagram: 'businessgodemo',
        twitter: 'businessgodemo',
      },
    },
  });

  const empresaDos = await prisma.empresa.upsert({
    where: { ruc: '20602356981' },
    update: {},
    create: {
      nombre: 'Tech Solutions',
      razon_social: 'Tech Solutions Perú S.A.C.',
      nombre_comercial: 'TechSolutions',
      ruc: '20602356981',
      telefono: '+51995123467',
      tipo_empresa: 'Tecnología',
      tipo_contribuyente: 'PYME',
      latitud: -12.1031,
      longitud: -77.0282,
      logo: 'https://via.placeholder.com/150',
      sitio_web: 'https://techsolutions.pe',
      redes_sociales: {
        facebook: 'techsolutionsperu',
        instagram: 'techsolutionsperu',
        linkedin: 'tech-solutions-peru',
      },
    },
  });

  // Relacionar usuarios con empresas
  const adminEmpresaRelacion = await prisma.usuarioEmpresa.upsert({
    where: {
      usuario_id_empresa_id: {
        usuario_id: adminUser.id_usuario,
        empresa_id: empresaDemo.id_empresa,
      },
    },
    update: {},
    create: {
      usuario_id: adminUser.id_usuario,
      empresa_id: empresaDemo.id_empresa,
      cargo: 'Administrador General',
      departamento: 'Dirección',
      es_dueno: true,
    },
  });

  const empresaUserRelacion = await prisma.usuarioEmpresa.upsert({
    where: {
      usuario_id_empresa_id: {
        usuario_id: empresaUser.id_usuario,
        empresa_id: empresaDemo.id_empresa,
      },
    },
    update: {},
    create: {
      usuario_id: empresaUser.id_usuario,
      empresa_id: empresaDemo.id_empresa,
      cargo: 'Gerente',
      departamento: 'Ventas',
      es_dueno: false,
    },
  });

  // Crear un rol de empresa
  const rolEmpresaVentas = await prisma.rolEmpresa.upsert({
    where: {
      nombre_id_empresa: {
        nombre: 'VENTAS',
        id_empresa: empresaDemo.id_empresa,
      },
    },
    update: {},
    create: {
      nombre: 'VENTAS',
      descripcion: 'Rol para el equipo de ventas',
      id_empresa: empresaDemo.id_empresa,
      horario_inicio: '09:00',
      horario_fin: '18:00',
    },
  });

  // Asignar rol de empresa al usuario empresa
  const usuarioRolEmpresa = await prisma.usuarioRolEmpresa.upsert({
    where: {
      id_usuario_id_rol: {
        id_usuario: empresaUser.id_usuario,
        id_rol: rolEmpresaVentas.id_rol,
      },
    },
    update: {},
    create: {
      id_usuario: empresaUser.id_usuario,
      id_rol: rolEmpresaVentas.id_rol,
      fecha_inicio: new Date(),
    },
  });

  // Crear permisos básicos
  const permisosBase = [
    {
      nombre: 'VENTAS.VIEW',
      descripcion: 'Ver ventas',
      recurso: 'ventas',
      accion: 'read',
    },
    {
      nombre: 'VENTAS.CREATE',
      descripcion: 'Crear ventas',
      recurso: 'ventas',
      accion: 'create',
    },
    {
      nombre: 'VENTAS.UPDATE',
      descripcion: 'Actualizar ventas',
      recurso: 'ventas',
      accion: 'update',
    },
    {
      nombre: 'VENTAS.DELETE',
      descripcion: 'Eliminar ventas',
      recurso: 'ventas',
      accion: 'delete',
    },
    {
      nombre: 'CLIENTES.VIEW',
      descripcion: 'Ver clientes',
      recurso: 'clientes',
      accion: 'read',
    },
    {
      nombre: 'CLIENTES.CREATE',
      descripcion: 'Crear clientes',
      recurso: 'clientes',
      accion: 'create',
    },
    {
      nombre: 'CLIENTES.UPDATE',
      descripcion: 'Actualizar clientes',
      recurso: 'clientes',
      accion: 'update',
    },
    {
      nombre: 'CLIENTES.DELETE',
      descripcion: 'Eliminar clientes',
      recurso: 'clientes',
      accion: 'delete',
    },
    {
      nombre: 'INVENTARIO.VIEW',
      descripcion: 'Ver inventario',
      recurso: 'inventario',
      accion: 'read',
    },
    {
      nombre: 'INVENTARIO.CREATE',
      descripcion: 'Crear inventario',
      recurso: 'inventario',
      accion: 'create',
    },
    {
      nombre: 'INVENTARIO.UPDATE',
      descripcion: 'Actualizar inventario',
      recurso: 'inventario',
      accion: 'update',
    },
    {
      nombre: 'INVENTARIO.DELETE',
      descripcion: 'Eliminar inventario',
      recurso: 'inventario',
      accion: 'delete',
    },
  ];

  for (const permisoData of permisosBase) {
    await prisma.permiso.upsert({
      where: { nombre: permisoData.nombre },
      update: {},
      create: permisoData,
    });
  }

  // Asignar permisos al rol VENTAS de la empresa
  const permisosVentas = await prisma.permiso.findMany({
    where: {
      OR: [
        { nombre: { startsWith: 'VENTAS' } },
        { nombre: { startsWith: 'CLIENTES' } },
      ],
    },
  });

  for (const permiso of permisosVentas) {
    await prisma.permisoRolEmpresa.upsert({
      where: {
        id_rol_recurso_accion: {
          id_rol: rolEmpresaVentas.id_rol,
          recurso: permiso.recurso,
          accion: permiso.accion,
        },
      },
      update: {},
      create: {
        id_rol: rolEmpresaVentas.id_rol,
        permiso_id: permiso.id_permiso,
        recurso: permiso.recurso,
        accion: permiso.accion,
      },
    });
  }

  // Crear un cliente asociado al usuario cliente
  const clientePerfil = await prisma.cliente.upsert({
    where: { id_usuario: clienteUser.id_usuario },
    update: {},
    create: {
      id_usuario: clienteUser.id_usuario,
      nombre: 'Cliente Business Go',
      email: clienteUser.email,
      telefono: clienteUser.telefono,
      tipo_cliente: 'individual',
      limite_credito: 5000,
      dias_credito: 30,
    },
  });

  // Asociar el cliente a la empresa
  const clienteEmpresa = await prisma.clienteEmpresa.upsert({
    where: {
      cliente_id_empresa_id: {
        cliente_id: clientePerfil.id_cliente,
        empresa_id: empresaDemo.id_empresa,
      },
    },
    update: {},
    create: {
      cliente_id: clientePerfil.id_cliente,
      empresa_id: empresaDemo.id_empresa,
    },
  });

  // Crear categorías de productos
  const categoriaElectronica = await prisma.categoria.upsert({
    where: { id_categoria: 1 },
    update: {},
    create: { nombre: 'Electrónica' },
  });

  const categoriaRopa = await prisma.categoria.upsert({
    where: { id_categoria: 2 },
    update: {},
    create: { nombre: 'Ropa' },
  });

  // Crear subcategorías
  const subcategoriaSmartphones = await prisma.subcategoria.upsert({
    where: { id_subcategoria: 1 },
    update: {},
    create: {
      nombre: 'Smartphones',
      id_categoria: categoriaElectronica.id_categoria,
    },
  });

  const subcategoriaCamisas = await prisma.subcategoria.upsert({
    where: { id_subcategoria: 2 },
    update: {},
    create: {
      nombre: 'Camisas',
      id_categoria: categoriaRopa.id_categoria,
    },
  });

  // Crear productos
  const productoSmartphone = await prisma.productoServicio.upsert({
    where: { id_producto: 1 },
    update: {},
    create: {
      nombre: 'Smartphone XYZ',
      precio: 1299.9,
      id_empresa: empresaDemo.id_empresa,
      id_categoria: categoriaElectronica.id_categoria,
      id_subcategoria: subcategoriaSmartphones.id_subcategoria,
      es_servicio: false,
    },
  });

  const productoCamisa = await prisma.productoServicio.upsert({
    where: { id_producto: 2 },
    update: {},
    create: {
      nombre: 'Camisa Business Casual',
      precio: 89.9,
      id_empresa: empresaDemo.id_empresa,
      id_categoria: categoriaRopa.id_categoria,
      id_subcategoria: subcategoriaCamisas.id_subcategoria,
      es_servicio: false,
    },
  });

  // Crear stock para los productos
  await prisma.stock.upsert({
    where: { id_producto: productoSmartphone.id_producto },
    update: {},
    create: {
      id_producto: productoSmartphone.id_producto,
      cantidad: 50,
    },
  });

  await prisma.stock.upsert({
    where: { id_producto: productoCamisa.id_producto },
    update: {},
    create: {
      id_producto: productoCamisa.id_producto,
      cantidad: 100,
    },
  });

  // Crear un método de pago
  const metodoPagoTransferencia = await prisma.metodoPago.upsert({
    where: { nombre: 'Transferencia Bancaria' },
    update: {},
    create: {
      nombre: 'Transferencia Bancaria',
      descripcion: 'Transferencia a cuenta bancaria de la empresa',
      tipo_pago: 'transferencia',
      tiene_comision: false,
    },
  });

  const metodoPagoTarjeta = await prisma.metodoPago.upsert({
    where: { nombre: 'Tarjeta de Crédito' },
    update: {},
    create: {
      nombre: 'Tarjeta de Crédito',
      descripcion: 'Pago con tarjeta de crédito',
      tipo_pago: 'tarjeta',
      tiene_comision: true,
      porcentaje_comision: 3.5,
    },
  });

  // Crear direcciones para la empresa
  const direccionEmpresa = await prisma.direccion.upsert({
    where: { id_direccion: 1 },
    update: {},
    create: {
      direccion: 'Av. República de Panamá 3647',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'San Isidro',
      id_empresa: empresaDemo.id_empresa,
    },
  });

  // Crear datos para cotizaciones
  const cotizacion = await prisma.cotizacion.upsert({
    where: { id_cotizacion: 1 },
    update: {},
    create: {
      id_empresa: empresaDemo.id_empresa,
      id_cliente: clientePerfil.id_cliente,
      fecha_emision: new Date(),
      fecha_validez: new Date(new Date().setDate(new Date().getDate() + 15)),
      subtotal: 1389.8,
      descuento: 89.9,
      igv: 233.99,
      total: 1533.89,
      estado: 'pendiente',
      notas: 'Cotización de prueba',
    },
  });

  // Añadir items a la cotización
  const itemCotizacion1 = await prisma.itemCotizacion.upsert({
    where: { id_item_cotizacion: 1 },
    update: {},
    create: {
      id_cotizacion: cotizacion.id_cotizacion,
      id_producto: productoSmartphone.id_producto,
      cantidad: 1,
      precio_unitario: 1299.9,
      descuento: 0,
      subtotal: 1299.9,
    },
  });

  const itemCotizacion2 = await prisma.itemCotizacion.upsert({
    where: { id_item_cotizacion: 2 },
    update: {},
    create: {
      id_cotizacion: cotizacion.id_cotizacion,
      id_producto: productoCamisa.id_producto,
      cantidad: 1,
      precio_unitario: 89.9,
      descuento: 0,
      subtotal: 89.9,
    },
  });

  // Crear una orden de venta basada en la cotización
  const ordenVenta = await prisma.ordenVenta.upsert({
    where: { id_orden_venta: 1 },
    update: {},
    create: {
      id_empresa: empresaDemo.id_empresa,
      id_cliente: clientePerfil.id_cliente,
      id_cotizacion: cotizacion.id_cotizacion,
      fecha_emision: new Date(),
      fecha_entrega: new Date(new Date().setDate(new Date().getDate() + 3)),
      subtotal: 1389.8,
      descuento: 89.9,
      igv: 233.99,
      total: 1533.89,
      estado: 'PENDIENTE',
      notas: 'Orden de venta basada en cotización',
    },
  });

  // Añadir items a la orden de venta
  const itemOrdenVenta1 = await prisma.itemOrdenVenta.upsert({
    where: { id_item_orden_venta: 1 },
    update: {},
    create: {
      id_orden_venta: ordenVenta.id_orden_venta,
      id_producto: productoSmartphone.id_producto,
      cantidad: 1,
      precio_unitario: 1299.9,
      descuento: 0,
      subtotal: 1299.9,
    },
  });

  const itemOrdenVenta2 = await prisma.itemOrdenVenta.upsert({
    where: { id_item_orden_venta: 2 },
    update: {},
    create: {
      id_orden_venta: ordenVenta.id_orden_venta,
      id_producto: productoCamisa.id_producto,
      cantidad: 1,
      precio_unitario: 89.9,
      descuento: 0,
      subtotal: 89.9,
    },
  });

  // Crear una factura para la orden de venta
  const factura = await prisma.factura.upsert({
    where: { id_orden_venta: ordenVenta.id_orden_venta },
    update: {},
    create: {
      id_orden_venta: ordenVenta.id_orden_venta,
      numero_factura: 'F001-00001',
      fecha_emision: new Date(),
      subtotal: 1389.8,
      descuento: 89.9,
      igv: 233.99,
      total: 1533.89,
      estado: 'emitida',
      notas: 'Factura de prueba',
    },
  });

  // Crear una nota de crédito
  const notaCredito = await prisma.notaCredito.upsert({
    where: { numero_nota: 'NC001-00001' },
    update: {},
    create: {
      id_factura: factura.id_factura,
      numero_nota: 'NC001-00001',
      fecha_emision: new Date(),
      motivo: 'Devolución parcial',
      monto: 89.9,
      estado: 'emitida',
    },
  });

  // Item para la nota de crédito
  const itemNotaCredito = await prisma.itemNotaCredito.upsert({
    where: { id_item_nota_credito: 1 },
    update: {},
    create: {
      id_nota_credito: notaCredito.id_nota_credito,
      id_producto: productoCamisa.id_producto,
      cantidad: 1,
      precio_unitario: 89.9,
      igv_porcentaje: 18,
      subtotal: 76.19,
      igv: 13.71,
      total: 89.9,
    },
  });

  // Crear una nota de débito
  const notaDebito = await prisma.notaDebito.upsert({
    where: { numero_nota: 'ND001-00001' },
    update: {},
    create: {
      id_factura: factura.id_factura,
      numero_nota: 'ND001-00001',
      fecha_emision: new Date(),
      motivo: 'Penalidad por pago tardío',
      monto: 50.0,
      estado: 'emitida',
    },
  });

  // Item para la nota de débito
  const itemNotaDebito = await prisma.itemNotaDebito.upsert({
    where: { id_item_nota_debito: 1 },
    update: {},
    create: {
      id_nota_debito: notaDebito.id_nota_debito,
      id_producto: productoSmartphone.id_producto,
      cantidad: 1,
      precio_unitario: 50.0,
      igv_porcentaje: 18,
      subtotal: 42.37,
      igv: 7.63,
      total: 50.0,
    },
  });

  // Crear valoraciones para los productos
  const valoracionProducto1 = await prisma.valoracion.upsert({
    where: { id_valoracion: 1 },
    update: {},
    create: {
      id_cliente: clientePerfil.id_cliente,
      id_producto: productoSmartphone.id_producto,
      puntuacion: 5,
      comentario: 'Excelente smartphone, muy rápido y buena cámara',
      estado_moderacion: 'aprobado',
    },
  });

  const valoracionProducto2 = await prisma.valoracion.upsert({
    where: { id_valoracion: 2 },
    update: {},
    create: {
      id_cliente: clientePerfil.id_cliente,
      id_producto: productoCamisa.id_producto,
      puntuacion: 4,
      comentario: 'Buena calidad, pero un poco ajustada la talla',
      estado_moderacion: 'aprobado',
    },
  });

  // Crear un proveedor
  const proveedor = await prisma.proveedor.upsert({
    where: { id_proveedor: 1 },
    update: {},
    create: {
      nombre: 'Distribuidora TechImport',
      ruc: '20503645789',
      direccion: 'Av. Argentina 3245',
      telefono: '+51995123456',
      email: 'ventas@techimport.com',
      contacto_principal: 'Juan Pérez',
      notas: 'Proveedor principal de electrónica',
      empresa_id: empresaDemo.id_empresa,
    },
  });

  // Asociar productos con el proveedor
  const productoProveedor = await prisma.productoProveedor.upsert({
    where: {
      id_proveedor_id_producto: {
        id_proveedor: proveedor.id_proveedor,
        id_producto: productoSmartphone.id_producto,
      },
    },
    update: {},
    create: {
      id_proveedor: proveedor.id_proveedor,
      id_producto: productoSmartphone.id_producto,
      codigo_proveedor: 'SMRTXYZ001',
      precio_compra: 980.0,
      tiempo_entrega: 5,
      stock_minimo: 10,
      stock_maximo: 100,
    },
  });

  // Crear orden de compra
  const ordenCompra = await prisma.ordenCompra.upsert({
    where: { numero_orden: 'OC001-00001' },
    update: {},
    create: {
      numero_orden: 'OC001-00001',
      fecha_emision: new Date(),
      fecha_entrega: new Date(new Date().setDate(new Date().getDate() + 7)),
      estado: 'pendiente',
      subtotal: 9800.0,
      igv: 1764.0,
      total: 11564.0,
      notas: 'Orden de compra de prueba',
      id_proveedor: proveedor.id_proveedor,
      id_empresa: empresaDemo.id_empresa,
    },
  });

  // Items para la orden de compra
  const itemOrdenCompra = await prisma.itemOrdenCompra.upsert({
    where: { id_item_orden_compra: 1 },
    update: {},
    create: {
      id_orden_compra: ordenCompra.id_orden_compra,
      id_producto: productoSmartphone.id_producto,
      cantidad: 10,
      precio_unitario: 980.0,
      subtotal: 9800.0,
      fecha_entrega: new Date(new Date().setDate(new Date().getDate() + 7)),
      estado: 'pendiente',
    },
  });

  // Crear configuraciones para la empresa
  const configRegional = await prisma.configuracionRegional.upsert({
    where: { id_empresa: empresaDemo.id_empresa },
    update: {},
    create: {
      id_empresa: empresaDemo.id_empresa,
      zona_horaria: 'America/Lima',
      formato_fecha: 'DD/MM/YYYY',
      formato_hora: 'HH:mm:ss',
      idioma: 'es',
      formato_numero: '#,##0.00',
    },
  });

  const configImpuestos = await prisma.configuracionImpuestos.upsert({
    where: { id_empresa: empresaDemo.id_empresa },
    update: {},
    create: {
      id_empresa: empresaDemo.id_empresa,
      tasa_iva: 0,
      tasa_isc: 0,
      tasa_igv: 18,
      redondeo: 2,
      incluir_impuestos: true,
    },
  });

  const configMoneda = await prisma.configuracionMoneda.upsert({
    where: { id_empresa: empresaDemo.id_empresa },
    update: {},
    create: {
      id_empresa: empresaDemo.id_empresa,
      moneda_principal: 'PEN',
      moneda_secundaria: 'USD',
      tipo_cambio: 3.68,
      redondeo: 2,
      formato_moneda: 'S/ #,##0.00',
    },
  });

  console.log({
    roles: { superAdminRole, adminRole, empresaRole, clienteRole },
    usuarios: { superAdminUser, adminUser, empresaUser, clienteUser },
    empresas: { empresaDemo, empresaDos },
    direcciones: { direccionEmpresa },
    relaciones: {
      adminEmpresaRelacion,
      empresaUserRelacion,
      usuarioRolEmpresa,
      productoProveedor,
    },
    roles_empresa: { rolEmpresaVentas },
    cliente: { clientePerfil, clienteEmpresa },
    productos: { productoSmartphone, productoCamisa },
    metodos_pago: { metodoPagoTransferencia, metodoPagoTarjeta },
    ventas: {
      cotizacion,
      itemsCotizacion: { itemCotizacion1, itemCotizacion2 },
      ordenVenta,
      itemsOrdenVenta: { itemOrdenVenta1, itemOrdenVenta2 },
      factura,
      notaCredito,
      itemNotaCredito,
      notaDebito,
      itemNotaDebito,
      valoraciones: { valoracionProducto1, valoracionProducto2 },
    },
    compras: {
      proveedor,
      ordenCompra,
      itemOrdenCompra,
    },
    configuraciones: {
      regional: configRegional,
      impuestos: configImpuestos,
      moneda: configMoneda,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
