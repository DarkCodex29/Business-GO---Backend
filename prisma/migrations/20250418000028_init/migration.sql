-- CreateTable
CREATE TABLE "Rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "contrasena" TEXT NOT NULL,
    "rol_id" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id_cliente" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id_empresa" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "tipo_empresa" TEXT NOT NULL,
    "latitud" DECIMAL(9,6) NOT NULL,
    "longitud" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id_empresa")
);

-- CreateTable
CREATE TABLE "Direccion" (
    "id_direccion" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" DECIMAL(9,6) NOT NULL,
    "longitud" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "Direccion_pkey" PRIMARY KEY ("id_direccion")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "Subcategoria" (
    "id_subcategoria" SERIAL NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Subcategoria_pkey" PRIMARY KEY ("id_subcategoria")
);

-- CreateTable
CREATE TABLE "ProductoServicio" (
    "id_producto" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "id_empresa" BIGINT NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "id_subcategoria" INTEGER,
    "es_servicio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductoServicio_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "Atributo" (
    "id_atributo" BIGSERIAL NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Atributo_pkey" PRIMARY KEY ("id_atributo")
);

-- CreateTable
CREATE TABLE "HistorialCompra" (
    "id_historial" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "fecha_compra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialCompra_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id_cita" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_empresa" BIGINT NOT NULL,
    "fecha_cita" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id_cita")
);

-- CreateTable
CREATE TABLE "MetodoPago" (
    "id_metodo_pago" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo_pago" TEXT NOT NULL,
    "tiene_comision" BOOLEAN NOT NULL DEFAULT false,
    "porcentaje_comision" DECIMAL(5,2),

    CONSTRAINT "MetodoPago_pkey" PRIMARY KEY ("id_metodo_pago")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id_pago" BIGSERIAL NOT NULL,
    "id_historial" BIGINT NOT NULL,
    "id_metodo_pago" BIGINT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado_pago" TEXT NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "LogPago" (
    "id_log_pago" BIGSERIAL NOT NULL,
    "id_pago" BIGINT NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "accion" TEXT NOT NULL,
    "fecha_accion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogPago_pkey" PRIMARY KEY ("id_log_pago")
);

-- CreateTable
CREATE TABLE "Valoracion" (
    "id_valoracion" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,

    CONSTRAINT "Valoracion_pkey" PRIMARY KEY ("id_valoracion")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id_notificacion" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha_notificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id_feedback" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "comentario" TEXT NOT NULL,
    "fecha_feedback" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id_feedback")
);

-- CreateTable
CREATE TABLE "Fidelizacion" (
    "id_fidelizacion" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "Fidelizacion_pkey" PRIMARY KEY ("id_fidelizacion")
);

-- CreateTable
CREATE TABLE "Disponibilidad" (
    "id_disponibilidad" BIGSERIAL NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "cantidad_disponible" INTEGER NOT NULL,

    CONSTRAINT "Disponibilidad_pkey" PRIMARY KEY ("id_disponibilidad")
);

-- CreateTable
CREATE TABLE "Comunicacion" (
    "id_comunicacion" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha_comunicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comunicacion_pkey" PRIMARY KEY ("id_comunicacion")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id_stock" BIGSERIAL NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id_stock")
);

-- CreateTable
CREATE TABLE "AuditoriaCambio" (
    "id_auditoria" BIGSERIAL NOT NULL,
    "tabla_nombre" TEXT NOT NULL,
    "id_registro" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "fecha_accion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" BIGINT NOT NULL,
    "detalles" JSONB NOT NULL,

    CONSTRAINT "AuditoriaCambio_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "Autenticacion2FA" (
    "id_2fa" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "codigo_verificacion" TEXT NOT NULL,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Autenticacion2FA_pkey" PRIMARY KEY ("id_2fa")
);

-- CreateTable
CREATE TABLE "Reembolso" (
    "id_reembolso" BIGSERIAL NOT NULL,
    "id_pago" BIGINT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_reembolso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "Reembolso_pkey" PRIMARY KEY ("id_reembolso")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_id_usuario_key" ON "Cliente"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_id_usuario_key" ON "Empresa"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "MetodoPago_nombre_key" ON "MetodoPago"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Disponibilidad_id_producto_key" ON "Disponibilidad"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_id_producto_key" ON "Stock"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "Autenticacion2FA_id_usuario_key" ON "Autenticacion2FA"("id_usuario");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "Rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategoria" ADD CONSTRAINT "Subcategoria_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "Categoria"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoServicio" ADD CONSTRAINT "ProductoServicio_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoServicio" ADD CONSTRAINT "ProductoServicio_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "Categoria"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoServicio" ADD CONSTRAINT "ProductoServicio_id_subcategoria_fkey" FOREIGN KEY ("id_subcategoria") REFERENCES "Subcategoria"("id_subcategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atributo" ADD CONSTRAINT "Atributo_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "ProductoServicio"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialCompra" ADD CONSTRAINT "HistorialCompra_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialCompra" ADD CONSTRAINT "HistorialCompra_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "ProductoServicio"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_id_historial_fkey" FOREIGN KEY ("id_historial") REFERENCES "HistorialCompra"("id_historial") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_id_metodo_pago_fkey" FOREIGN KEY ("id_metodo_pago") REFERENCES "MetodoPago"("id_metodo_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPago" ADD CONSTRAINT "LogPago_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "Pago"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPago" ADD CONSTRAINT "LogPago_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valoracion" ADD CONSTRAINT "Valoracion_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valoracion" ADD CONSTRAINT "Valoracion_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "ProductoServicio"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fidelizacion" ADD CONSTRAINT "Fidelizacion_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disponibilidad" ADD CONSTRAINT "Disponibilidad_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "ProductoServicio"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comunicacion" ADD CONSTRAINT "Comunicacion_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "ProductoServicio"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaCambio" ADD CONSTRAINT "AuditoriaCambio_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autenticacion2FA" ADD CONSTRAINT "Autenticacion2FA_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reembolso" ADD CONSTRAINT "Reembolso_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "Pago"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;
